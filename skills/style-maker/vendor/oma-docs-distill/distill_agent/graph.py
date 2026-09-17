from collections import Counter
import operator
from typing import Annotated, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from .llm import LLMClient
from .prompts import SYSTEM, lexicon_prompt, map_prompt, reduce_prompt
from .profiles import load_profile
from .text import extract_candidate_ngrams, extract_document_metadata, token_frequencies


class DistillState(TypedDict, total=False):
    documents: list[dict[str, str]]
    candidate_words: list[str]
    domain_dictionary: list[str]
    maps: Annotated[list[dict], operator.add]
    final: dict


class MapState(TypedDict):
    doc_id: str
    content: str
    domain_dictionary: list[str]
    metadata: dict[str, object]


def build_graph(llm: LLMClient, profile_name: str = "policy"):
    profile = load_profile(profile_name)
    def bootstrap(state: DistillState):
        text = "\n".join(doc["content"] for doc in state["documents"])
        candidates = extract_candidate_ngrams(text)
        print(f"[1/3] 正在审校 {len(candidates)} 个候选词并构建领域词表...", flush=True)
        result = llm.ask_json(SYSTEM, lexicon_prompt(candidates, profile["description"]))
        terms = [str(x).strip() for x in result.get("terms", []) if str(x).strip()]
        print(f"[1/3] 领域词表完成：{len(terms)} 个词条", flush=True)
        return {"candidate_words": candidates, "domain_dictionary": list(dict.fromkeys(terms))}

    def dispatch(state: DistillState):
        return [
            Send(
                "map_document",
                {
                    **doc,
                    "domain_dictionary": state["domain_dictionary"],
                    "metadata": extract_document_metadata(doc["doc_id"], doc["content"], profile["default_article_type"]),
                },
            )
            for doc in state["documents"]
        ]

    def map_document(state: MapState):
        print(f"[2/3] 开始分析：{state['doc_id']}", flush=True)
        frequencies = token_frequencies(state["content"], state["domain_dictionary"])
        try:
            result = llm.ask_json(SYSTEM, map_prompt(state["doc_id"], state["content"], [w for w, _ in frequencies.most_common(30)], state["metadata"], profile))
        except Exception as exc:  # keep one bad document from losing the whole batch
            result = {"error": str(exc), "cleaned_summary": "", "structures": [], "tone_style": [], "terms": [], "few_shots": []}
        result["doc_id"] = state["doc_id"]
        result["metadata"] = {**state["metadata"], **result.get("metadata", {})}
        result["local_terms"] = [w for w, _ in frequencies.most_common(30)]
        print(f"[2/3] 完成分析：{state['doc_id']}", flush=True)
        return {"maps": [result]}

    def reduce(state: DistillState):
        print(f"[3/3] 正在汇总 {len(state.get('maps', []))} 篇分析并生成 Skill...", flush=True)
        result = llm.ask_json(SYSTEM, reduce_prompt(len(state["documents"]), state["domain_dictionary"], state.get("maps", []), profile))
        print("[3/3] Skill 内容生成完成", flush=True)
        return {"final": result}

    workflow = StateGraph(DistillState)
    workflow.add_node("bootstrap", bootstrap)
    workflow.add_node("map_document", map_document)
    workflow.add_node("reduce", reduce)
    workflow.add_edge(START, "bootstrap")
    workflow.add_conditional_edges("bootstrap", dispatch)
    workflow.add_edge("map_document", "reduce")
    workflow.add_edge("reduce", END)
    return workflow.compile()
