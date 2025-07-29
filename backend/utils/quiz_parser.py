import re
from typing import List, Dict
import json

def parse_mcqs(text: str) -> List[Dict]:
    """
    Extremely forgiving MCQ parser for LLM output.
    Handles:
    - Qx) or Qx: as question start (with or without question text)
    - Options labeled A) to D) (any delimiter, any order)
    - Answers as letter, letter+delimiter, or full text
    - Ignores <think> blocks and explanations
    - Recovers from missing or extra whitespace, dashes, etc.
    """
    mcqs = []
    # Remove <think> blocks and explanations
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    # Split into question blocks
    q_blocks = re.split(r"\n\s*(?=Q\d+[\):])", text)
    for block in q_blocks:
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if not lines or not re.match(r"^Q\d+[\):]", lines[0]):
            continue
        # Extract question text (may be empty)
        q_line = lines[0]
        question = re.sub(r"^Q\d+[\):]\s*", "", q_line)
        if not question:
            # Try to use the next line as question if first is empty
            if len(lines) > 1 and not re.match(r"^[A-Da-d][\)\.:\-]", lines[1]):
                question = lines[1]
                lines = [lines[0]] + lines[2:]
        options = {}
        answer = None
        # Parse options and answer
        for line in lines[1:]:
            opt_match = re.match(r"^([A-Da-d])[\)\.:\-]?\s*(.*)$", line)
            if opt_match:
                key = opt_match.group(1).upper()
                val = opt_match.group(2).strip()
                options[key] = val
                continue
            ans_match = re.match(r"^Answer\s*[:\-]?\s*(.*)$", line, re.IGNORECASE)
            if ans_match:
                raw_ans = ans_match.group(1).strip()
                # Accept A, B, C, D, or full text
                if re.fullmatch(r"[A-Da-d]", raw_ans):
                    answer = raw_ans.upper()
                elif re.match(r"^[A-Da-d][\)\.:\-]?", raw_ans):
                    answer = raw_ans[0].upper()
                else:
                    # Try to match answer text to option (case-insensitive, partial match allowed)
                    for k, v in options.items():
                        if raw_ans.lower() in v.lower() or v.lower() in raw_ans.lower():
                            answer = k
                            break
        # If answer is still not found, try to guess (e.g., if only one option contains 'correct' or 'right')
        if not answer and options:
            for k, v in options.items():
                if 'correct' in v.lower() or 'right' in v.lower():
                    answer = k
                    break
        # Only append if at least 2 options and an answer
        if question and len(options) >= 2 and answer in options:
            # Fill missing options with empty strings if needed
            all_keys = ['A', 'B', 'C', 'D']
            opts = [options.get(k, "") for k in all_keys]
            mcqs.append({
                "question": question,
                "options": opts,
                "answer": options[answer]
            })
    return mcqs

def robust_parse_mcqs(text: str):
    """
    Extracts and parses the first JSON array from text, even if wrapped in markdown or with trailing commas.
    Returns a list of dicts or [] if parsing fails.
    """
    # Remove <think> blocks
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    # Extract JSON block if wrapped in markdown
    json_match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if json_match:
        text = json_match.group(1)
    # Extract first JSON array
    array_match = re.search(r"\[\s*{.*?}\s*\]", text, re.DOTALL)
    if array_match:
        text = array_match.group(0)
    # Remove trailing commas before closing brackets
    text = re.sub(r",\s*([\]}])", r"\1", text)
    # Remove any trailing commas in arrays
    text = re.sub(r",\s*\]", "]", text)
    try:
        return json.loads(text)
    except Exception as e:
        # Optionally log the error
        # print(f"robust_parse_mcqs failed: {e}\nRaw text:\n{text}")
        return []