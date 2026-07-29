from PIL import Image, ImageDraw
import os, math

os.makedirs("public/images/trust-kernel-for-finance-automation", exist_ok=True)
os.makedirs("public/images/earned-value-for-plant-programs", exist_ok=True)
os.makedirs("public/images/twenty-six-tools-one-surface", exist_ok=True)

# Case Study: Trust kernel for finance automation
# Hub-and-spoke: one kernel at center, 26 small tool nodes around it, all
# connected to the same center point (the "one trust story, not twenty-six" idea)
img1 = Image.new("RGB", (1200, 630), "#0a0a0a")
draw1 = ImageDraw.Draw(img1)
cx, cy = 600, 315
n_tools = 26
for i in range(n_tools):
    angle = math.radians(360 / n_tools * i - 90)
    r = 260
    x = cx + int(r * math.cos(angle))
    y = cy + int(r * math.sin(angle) * 0.78)  # slight ellipse to fit 1200x630
    draw1.line([(cx, cy), (x, y)], fill="#7c3aed", width=1)
    draw1.ellipse([(x - 7, y - 7), (x + 7, y + 7)], fill="#a78bfa", outline="#4c1d95", width=1)
# Kernel core: four rings for the four shared primitives
for i, r in enumerate([70, 52, 34, 16]):
    draw1.ellipse([(cx - r, cy - r), (cx + r, cy + r)], outline="#c4b5fd", width=2)
draw1.ellipse([(cx - 10, cy - 10), (cx + 10, cy + 10)], fill="#ede9fe")
img1.save("public/images/trust-kernel-for-finance-automation/hero.png")

# Case Study: Earned value for plant programs
# Five diverging forecast lines fanning out from one status-date point,
# plus a shaded Monte Carlo band -- "five forecasts, not one"
img2 = Image.new("RGB", (1200, 630), "#0a0a0a")
draw2 = ImageDraw.Draw(img2)
origin = (160, 470)
# axes
draw2.line([(120, 470), (1120, 470)], fill="#374151", width=1)
draw2.line([(160, 90), (160, 500)], fill="#374151", width=1)
# solid actuals up to the status date
draw2.line([origin, (560, 300)], fill="#e5e7eb", width=3)
draw2.ellipse([(555, 295), (565, 305)], fill="#e5e7eb")
# five diverging forecasts from the status-date point
endpoints = [
    ((1080, 130), "#f59e0b"),  # typical
    ((1080, 200), "#10b981"),  # CPI
    ((1080, 260), "#3b82f6"),  # CPI x SPI
    ((1080, 340), "#ef4444"),  # reforecast
    ((1080, 420), "#a78bfa"),  # monte carlo p50
]
for (ex, ey), color in endpoints:
    draw2.line([(560, 300), (ex, ey)], fill=color, width=2)
    draw2.ellipse([(ex - 5, ey - 5), (ex + 5, ey + 5)], fill=color)
# Monte Carlo p50/p80 band as a translucent-look polygon (approximated with lines)
for y_off in range(-40, 41, 8):
    draw2.line([(560, 300), (1080, 420 + y_off // 2)], fill="#4c1d95", width=1)
img2.save("public/images/earned-value-for-plant-programs/hero.png")

# Case Study: Twenty-six tools, one surface
# A worst-first findings feed (left column, sorted rows) feeding a
# consolidated dashboard grid (right) -- the "one surface" idea
img3 = Image.new("RGB", (1200, 630), "#0a0a0a")
draw3 = ImageDraw.Draw(img3)
# Findings feed: 10 worst-first rows, severity-coded
sev_colors = ["#ef4444"] * 2 + ["#f59e0b"] * 3 + ["#eab308"] * 2 + ["#10b981"] * 3
for i, color in enumerate(sev_colors):
    y = 60 + i * 48
    draw3.rounded_rectangle([(60, y), (480, y + 36)], radius=4, fill="#111827", outline=color, width=2)
    draw3.rectangle([(60, y), (68, y + 36)], fill=color)
# Dashboard grid: 26 small tiles on the right, one lit up (linked from feed)
cols, rows = 6, 5
tile_w, tile_h, gap = 100, 92, 12
start_x, start_y = 560, 55
for i in range(26):
    col = i % cols
    row = i // cols
    x = start_x + col * (tile_w + gap)
    y = start_y + row * (tile_h + gap)
    fill = "#1e3a5f" if i != 4 else "#312e81"
    outline = "#3b82f6" if i != 4 else "#a78bfa"
    draw3.rounded_rectangle([(x, y), (x + tile_w, y + tile_h)], radius=6, fill=fill, outline=outline, width=2)
# link from the top finding to the lit-up tile
lit_col, lit_row = 4 % cols, 4 // cols
lit_x = start_x + lit_col * (tile_w + gap) + tile_w // 2
lit_y = start_y + lit_row * (tile_h + gap) + tile_h // 2
draw3.line([(480, 78), (lit_x, lit_y)], fill="#a78bfa", width=2)
img3.save("public/images/twenty-six-tools-one-surface/hero.png")

print("Second hero-image batch created successfully")
