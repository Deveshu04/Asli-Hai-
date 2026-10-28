import unicodedata

CHILD_SAFE = "child_safe"
CHILD_CONFIRMED = "child_confirmed"
NOT_CONFIRMED = "not_confirmed"


def normalize_word(text: str | None) -> str:
    # NFC first: Sarvam may emit nukta letters (क़) as one code point or as क + ़.
    # Keep only letters, marks and digits, so matras survive and ASR punctuation (। . ,) drops.
    text = unicodedata.normalize("NFC", text or "").lower()
    return "".join(ch for ch in text if unicodedata.category(ch)[0] in "LMN")


def word_matches(spoken: str | None, latin: str, native: str) -> bool:
    heard = normalize_word(spoken)
    if not heard:
        return False
    return heard in {w for w in (normalize_word(latin), normalize_word(native)) if w}


def normalize_answer(did_call: str | None) -> str:
    answer = (did_call or "").strip().lower()
    if answer == "yes":
        return "Yes"
    if answer == "no":
        return "No"
    return "Unsure"


def decide(did_call: str | None, spoken_word: str | None, family: dict, child_name: str) -> tuple[str, dict]:
    answer = normalize_answer(did_call)
    if answer == "No":
        return CHILD_SAFE, {}
    if answer == "Yes" and word_matches(spoken_word, family["family_word_latin"], family["family_word_native"]):
        return CHILD_CONFIRMED, {"verified_name": child_name}
    return NOT_CONFIRMED, {}
