const INTONATION_MARK = {
  rise: "↗",
  fall: "↘",
};

export function buildAnnotatedText(sentence) {
  return (sentence?.tokens || []).map((token) => {
    const text = `${token.word}${token.dropPlosionEnd ? "̚" : ""}${token.trailingPunct || ""}`;
    const marks = [
      token.linkNext ? "‿" : "",
      token.pauseAfter ? "/" : "",
      token.intonationAfter ? INTONATION_MARK[token.intonationAfter] : "",
    ].filter(Boolean).join("");
    return `${text}${marks}`;
  }).join(" ");
}
