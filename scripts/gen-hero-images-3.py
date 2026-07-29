from PIL import Image, ImageDraw
import os

os.makedirs("public/images/cross-tool-findings-bus", exist_ok=True)
os.makedirs("public/images/carbon-adjusted-throughput-at-the-bottleneck", exist_ok=True)

# Concept: cross-tool findings bus
# 14 differently-shaped nodes (heterogeneous tool output) funneling through an
# adapter layer into one normalized stream -- one node (the PACA override) is
# marked in a distinct color to represent the preserved severity override.
img1 = Image.new("RGB", (1200, 630), "#0a0a0a")
draw1 = ImageDraw.Draw(img1)
shapes = ["circle", "square", "triangle", "diamond"]
n_tools = 14
left_x = 140
top_y, bottom_y = 60, 560
for i in range(n_tools):
    y = top_y + i * (bottom_y - top_y) / (n_tools - 1)
    shape = shapes[i % len(shapes)]
    color = "#f59e0b" if i == 9 else "#60a5fa"  # the PACA-override tool, singled out
    s = 12
    if shape == "circle":
        draw1.ellipse([(left_x - s, y - s), (left_x + s, y + s)], fill=color)
    elif shape == "square":
        draw1.rectangle([(left_x - s, y - s), (left_x + s, y + s)], fill=color)
    elif shape == "triangle":
        draw1.polygon([(left_x, y - s), (left_x - s, y + s), (left_x + s, y + s)], fill=color)
    else:
        draw1.polygon([(left_x, y - s), (left_x + s, y), (left_x, y + s), (left_x - s, y)], fill=color)
    # line into the adapter funnel
    draw1.line([(left_x + s, y), (560, 315)], fill=color, width=1)

# Adapter funnel (the un-built layer, drawn as an open/dashed outline -- "0 built")
funnel_pts = [(540, 250), (620, 250), (600, 315), (620, 380), (540, 380), (560, 315)]
draw1.polygon(funnel_pts, outline="#7c3aed", width=3)
for i in range(0, 130, 14):
    draw1.line([(540 + i * 0.4, 255 + i * 0.15), (540 + i * 0.4, 260 + i * 0.15)], fill="#7c3aed", width=2)

# One normalized stream on the right, feeding a single findings-feed column
draw1.line([(620, 315), (760, 315)], fill="#c4b5fd", width=3)
for i in range(6):
    y = 190 + i * 50
    color = "#f59e0b" if i == 0 else "#a78bfa"
    draw1.rounded_rectangle([(780, y), (1080, y + 34)], radius=4, fill="#1e1b3a", outline=color, width=2)
    draw1.rectangle([(780, y), (786, y + 34)], fill=color)

img1.save("public/images/cross-tool-findings-bus/hero.png")

# Concept: carbon-adjusted throughput at the bottleneck
# Two parallel rankings (dollar vs carbon) through one bottleneck (hourglass shape),
# with one diverging product highlighted where $ rank is good but carbon rank is poor.
img2 = Image.new("RGB", (1200, 630), "#0a0a0a")
draw2 = ImageDraw.Draw(img2)

# Bottleneck: an hourglass/funnel silhouette at center
cx = 600
draw2.polygon([(500, 120), (700, 120), (620, 315), (700, 510), (500, 510), (580, 315)],
              outline="#e5e7eb", width=3)

products = 6
left_x, right_x = 140, 1060
for i in range(products):
    y_left = 90 + i * 80
    # dollar rank order (left column, descending value)
    draw2.rounded_rectangle([(left_x - 20, y_left - 16), (left_x + 20, y_left + 16)], radius=4,
                             fill="#1e3a5f", outline="#3b82f6", width=2)
    # carbon rank position on the right differs -- product 1 (index 0) diverges badly
    if i == 0:
        y_right = 90 + 4 * 80  # flagged: good $ rank, poor carbon rank
        color = "#ef4444"
    else:
        y_right = 90 + i * 80
        color = "#10b981"
    draw2.rounded_rectangle([(right_x - 20, y_right - 16), (right_x + 20, y_right + 16)], radius=4,
                             fill="#064e3b" if color == "#10b981" else "#7f1d1d",
                             outline=color, width=2)
    draw2.line([(left_x + 20, y_left), (500, 120 + (y_left - 90) * 0.7)], fill="#3b82f6", width=1)
    draw2.line([(700, 120 + (y_right - 90) * 0.7), (right_x - 20, y_right)], fill=color, width=1)

img2.save("public/images/carbon-adjusted-throughput-at-the-bottleneck/hero.png")

print("Third hero-image batch created successfully")
