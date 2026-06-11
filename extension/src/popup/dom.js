export function el(id) {
  return document.getElementById(id);
}

export function clear(node) {
  node.replaceChildren();
}

export function textNode(tagName, text, className = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

export function appendPair(parent, strongText, spanText) {
  const strong = document.createElement("strong");
  strong.textContent = strongText;
  const span = document.createElement("span");
  span.textContent = spanText;
  parent.append(strong, span);
}

export function setLoading(target, text) {
  const node = typeof target === "string" ? el(target) : target;
  clear(node);
  node.appendChild(textNode("p", text, "note"));
}
