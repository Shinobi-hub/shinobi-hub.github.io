# Editing this site

A practical guide. No coding knowledge assumed — everything here is
"find this text, change it, save."

---

## 1. Preview it on your own machine first

Open Terminal, then:

```bash
cd "/Users/shubhamdutta/Developer/My Website/shinobi-hub.github.io"
python3 -m http.server 8000
```

Now open **http://localhost:8000** in your browser.

Leave that Terminal window running while you work. Every time you save a file,
refresh the browser to see the change. Press `Ctrl+C` in Terminal to stop.

> **Always preview before you push.** If it looks right at localhost:8000, it
> will look right live.

---

## 2. Where everything lives

| File | What it is |
|---|---|
| `index.html` | The whole home page |
| `creator-details.html` | 3D, design and video page |
| `portfolio-details.html` | Illustration gallery |
| `iot-project-details.html` | Livingthings AI page |
| `team-leadership-details.html` | IIT Bombay page |
| `assets/css/site.css` | All the styling — colours, fonts, spacing |
| `assets/js/site.js` | Animations and the theme toggle |
| `assets/img/` | Photos and artwork |
| `assets/video/` | The house animation and its poster frame |
| `llms.txt`, `llms-full.txt` | Plain-text facts for AI assistants |
| `robots.txt`, `sitemap.xml` | Instructions for search engines |

Inside every HTML file, look for comment banners like this:

```html
<!-- ========================================================
     ABOUT  ·  safe to edit
     ======================================================== -->
```

Anything marked **safe to edit** is yours to change freely.

---

## 3. Changing words on the page

Open the file, use `Cmd+F` to find the sentence, change it, save, refresh.

The only rule: don't delete the `<p>`, `</p>`, `<h2>` or `</h2>` bits around the
text. Change what's *between* them.

```html
<p class="hero-lede">
  I'm the founder and CEO of <strong>Bortex</strong>, a defence-technology
  company building AI-powered border surveillance...    ← change this text
</p>
```

**Special characters:** write `&amp;` instead of `&`, and `&lt;` instead of `<`.
Everything else is fine as-is.

---

## 4. Changing colours or fonts

Open `assets/css/site.css`. The very top section is called **TOKENS**. Change a
value there and it updates across the entire site.

```css
--accent:        #4D8DFF;    ← the blue used for links and buttons
--bg:            #0B0E12;    ← page background (dark theme)
--fg:            #E9EEF4;    ← main text colour
```

There are two sets: the first block is the dark theme, and the block further
down starting `html:not(.dark)` is the light theme. **Change both** so the site
looks right either way.

---

## 5. Adding a job to the timeline

In `index.html`, find `03 — Experience`. Copy one whole block from
`<li class="tl-item"...>` to `</li>` and paste it where you want it, then edit:

```html
<li class="tl-item" data-reveal>
  <div class="tl-date">2025 — 2026</div>
  <div class="tl-body">
    <h3 class="tl-role">Your job title</h3>
    <p class="tl-org">Company name</p>
    <p class="tl-desc">One or two sentences.</p>
  </div>
</li>
```

Jobs are listed newest first. Add `tl-item--current` to the class if it's your
current role — that adds the small green dot.

---

## 6. Adding an image

1. Put the image file in `assets/img/`.
2. Give it a descriptive filename — `perimeter-tower-render.webp`, not
   `IMG_4821.webp`. Search engines read filenames.
3. Copy an existing block and change the four marked parts:

```html
<figure class="work-card">
  <img src="/assets/img/YOUR-FILE.webp"
       alt="A plain description of what is in the picture"
       width="1600" height="900" loading="lazy" decoding="async">
  <figcaption class="work-caption">Title<span>Small caption</span></figcaption>
</figure>
```

**`width` and `height` must match the real pixel size of your image.** If they
don't, the page will jump around while loading, which hurts your search ranking.
Find the real size by right-clicking the file → Get Info.

**`alt` is not optional.** It's what screen readers announce and what Google
reads. Describe the picture in a short sentence.

### Shrinking a big image first

Large photos slow the site down. To resize and convert one:

```bash
# replace the filename with yours
dwebp big-photo.webp -o /tmp/tmp.png
sips -Z 1600 /tmp/tmp.png --out /tmp/small.png
cwebp -q 80 /tmp/small.png -o assets/img/new-photo.webp
```

Aim for under 200 KB per image.

---

## 7. Editing the FAQ — read this bit carefully

The FAQ appears **twice** in `index.html`:

1. As visible text, in the section marked `06 — Questions`.
2. Inside the `<script type="application/ld+json">` block near the top of the
   file, which is the machine-readable copy that ChatGPT, Perplexity, Claude and
   Google read.

**If you change one, change the other to match.** If they disagree, search
engines trust neither.

Good FAQ answers are short, factual, and make sense on their own. Write
"Bortex is based in Bengaluru" rather than "We're based there" — an AI quoting
one sentence out of context needs the actual names present.

---

## 8. Keep these in sync

| If you change... | Also update... |
|---|---|
| A FAQ answer | The JSON-LD block at the top of `index.html` |
| Your job title or bio | `llms.txt` and `llms-full.txt` |
| A Bortex product detail | `llms-full.txt`, and check it still matches bortex.co.in |
| Adding a new page | `sitemap.xml`, and the links in `llms.txt` |

---

## 9. Publishing

The site is live at **https://shinobi-hub.github.io** and updates automatically
when you push to the `main` branch.

```bash
git add .
git commit -m "Update my bio"
git push
```

Give it about a minute, then hard-refresh the live site (`Cmd+Shift+R`).

> If something looks broken live but fine locally, it's almost always the
> browser showing you a cached copy. Hard-refresh first before worrying.

---

## 10. If you break something

Nothing is ever really lost — every version is saved in git.

```bash
# Undo your changes to one file, back to the last commit
git restore index.html

# See what you've changed but not yet committed
git status
```

---

## 11. Things to be careful with

- **Don't rename files** in `assets/` unless you also update every place they're
  referenced. Use `grep -r "old-filename" .` to find them all.
- **Don't delete the `data-reveal` attributes** — they're what makes sections
  fade in as you scroll.
- **Don't add large videos or images** without compressing them first. The whole
  site currently weighs about 1 MB; one uncompressed phone video would be 50× that.
