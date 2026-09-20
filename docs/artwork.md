# Elaina ASCII artwork

Input: owner-supplied `Elaina.jpg`. Prepared using the built-in imagegen tool, then converted deterministically to literal character rows with Sharp. The generated bitmap remains an offline source asset; the browser renders SVG text and animates only the silver-hair layers.

Final saved source: `src/assets/elaina-source.png`.
Final ASCII data: `src/data/elaina-ascii.json`.
Renderer: `src/components/AsciiPortrait.astro`.

Initial prompt:
> Use case: background-extraction. Edit target: supplied Elaina.jpg. Create a clean transparent-background cutout of the SAME anime witch character Elaina from the supplied image. Preserve her face, eyes, silver hair, large witch hat, clothing and exact pose/style. Keep the black cat she holds as part of the foreground. Remove ALL garden, flowers, leaves, architectural background, including foreground flowers; use actual alpha transparency, no checkerboard painted into image. Retain natural fine hair edges. Complete only small parts obscured by flowers, keep identity and proportions. Full foreground figure on transparent canvas; no text, no glow. This is an intermediate asset for converting to animated ASCII on a personal website.

The first output had a baked checkerboard rather than alpha transparency. It was not used. The final built-in edit used this prompt:
> Edit target supplied image: replace ONLY the gray/white checkerboard background with pure solid black RGB 0,0,0. Keep the character, witch hat, fine silver hair, face, clothes and cat identical. No checkerboard. No glow. Black background everywhere outside character silhouette. This is for luminance to ASCII conversion. Preserve pose and art.

Dark background pixels become spaces during conversion. The preserved foreground includes the cat from the supplied image. This is a generated adaptation of the supplied illustration, not a pixel-exact background mask.
