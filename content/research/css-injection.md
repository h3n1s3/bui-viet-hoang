---
title: 'CSS Injection: Blind Attribute Exfiltration'
date: 2026-09-16
description: 'Exploring the connection between attribute selectors, conditional resource requests and unintended information disclosure.'
tags: [Web Security, CSS Injection]
sample: true
---

CSS is usually treated as presentation. But selectors can also ask questions about a document, and some CSS declarations cause the browser to request resources. Those capabilities make untrusted styles worth examining as part of an application's attack surface.

This note uses a **local, visible test element** to explain the selector primitive. It is an illustrative lab exercise, not a report about a particular product.

## The underlying primitive

An attribute selector matches an attribute in the HTML document. An exact match checks the whole value; a prefix match checks its beginning. Neither operation executes JavaScript.

| Selector | What it checks |
| --- | --- |
| `[data-lab-token]` | The attribute exists |
| `[data-lab-token="demo"]` | The value equals `demo` |
| `[data-lab-token^="d"]` | The value begins with `d` |
| `[data-lab-token$="o"]` | The value ends with `o` |

### Attributes are not properties

A selector examines an attribute, not an arbitrary JavaScript variable or the text inside an element. A form control's current value property can differ from its original `value` attribute. That distinction changes what a test can establish.

## A minimal local experiment

Create an HTML file containing an ordinary, visible element with a dummy attribute:

```html title="lab.html"
<div class="probe" data-lab-token="demo">
  A visible element with a non-sensitive test value.
</div>
```

Then add a selector that changes its outline when the prefix matches:

```css title="probe.css"
/* A local visual signal; no data leaves the page. */
.probe[data-lab-token^="d"] {
  outline: 2px solid #a2b9d5;
}

.probe[data-lab-token^="x"] {
  outline: 2px solid #ff5f57;
}
```

The first rule matches. Change the attribute to `example` and neither rule matches. This demonstrates a *conditional observation*, not a complete extraction technique.

### From a match to an observation

If a matching rule loads a resource, an observer may distinguish a match through the resulting request. A real analysis must establish whether the stylesheet is accepted, the selector can reach the element, the declaration produces a request, and the page's policy allows the destination.

> A selector matching is only one condition. Rendering, browser behavior and resource policy all affect the result.

Hidden inputs do not render like this visible example. Do not assume that placing a background on a hidden element will produce the same behavior.

## Defensive considerations

1. Keep untrusted input out of stylesheet contexts.
2. Prefer constrained theme options to accepting arbitrary CSS.
3. Review `style-src` to control permitted stylesheet sources and inline styles.
4. Review resource directives such as `img-src` to limit permitted image destinations.

Content Security Policy is an additional control. It does not turn an unsafe CSS construction into a safe one.

## Further reading

- [MDN: Attribute selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/Attribute_selectors)
- [MDN: CSP style-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src)
- [MDN: CSP img-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/img-src)
