from PIL import Image, ImageDraw
import os

# Create directories
os.makedirs("public/images/operational-variance-command-center", exist_ok=True)
os.makedirs("public/images/multi-level-bom-margin-modeler", exist_ok=True)
os.makedirs("public/images/capex-asset-downtime-matrix", exist_ok=True)

# Case Study 1: Operational Variance Command Center
# Abstract visualization of data flowing into a central hub
img1 = Image.new("RGB", (1200, 630), "#0a0a0a")
draw1 = ImageDraw.Draw(img1)
# Flow lines converging to center
for i in range(8):
    y_start = 50 + i * 70
    draw1.line([(100, y_start), (600, 315)], fill="#3b82f6", width=2)
    draw1.line([(1100, y_start), (600, 315)], fill="#3b82f6", width=2)
# Central hub
draw1.ellipse([(520, 235), (680, 395)], fill="#1e3a5f", outline="#3b82f6", width=3)
# Radiating data points
for angle in range(0, 360, 30):
    import math
    rad = math.radians(angle)
    x = 600 + int(200 * math.cos(rad))
    y = 315 + int(120 * math.sin(rad))
    draw1.ellipse([(x-6, y-6), (x+6, y+6)], fill="#60a5fa")
img1.save("public/images/operational-variance-command-center/hero.png")

# Case Study 2: Multi-level BOM Margin Modeler
# Tree/hierarchy visualization
img2 = Image.new("RGB", (1200, 630), "#0a0a0a")
draw2 = ImageDraw.Draw(img2)
# Root node
draw2.rounded_rectangle([(540, 40), (660, 100)], radius=8, fill="#1e3a5f", outline="#10b981", width=2)
# Level 1 branches
for x in [300, 600, 900]:
    draw2.line([(600, 100), (x, 180)], fill="#10b981", width=2)
    draw2.rounded_rectangle([(x-60, 180), (x+60, 240)], radius=6, fill="#064e3b", outline="#10b981", width=1)
# Level 2 branches
for parent_x in [300, 600, 900]:
    for child_offset in [-80, 0, 80]:
        child_x = parent_x + child_offset
        draw2.line([(parent_x, 240), (child_x, 320)], fill="#10b981", width=1)
        draw2.rounded_rectangle([(child_x-30, 320), (child_x+30, 360)], radius=4, fill="#064e3b", outline="#34d399", width=1)
# Margin indicators
for x in [220, 300, 380, 520, 600, 680, 820, 900, 980]:
    y = 380
    draw2.rectangle([(x-15, y+10), (x+15, y+30)], fill="#10b981" if x % 200 > 100 else "#ef4444")
img2.save("public/images/multi-level-bom-margin-modeler/hero.png")

# Case Study 3: CapEx Asset Downtime Matrix
# Grid/matrix visualization
img3 = Image.new("RGB", (1200, 630), "#0a0a0a")
draw3 = ImageDraw.Draw(img3)
# Grid cells
for row in range(5):
    for col in range(5):
        x1 = 200 + col * 160
        y1 = 115 + row * 100
        # Color based on position (gradient from green to red)
        intensity = (row + col) / 8
        if intensity < 0.3:
            color = "#10b981"
        elif intensity < 0.6:
            color = "#f59e0b"
        else:
            color = "#ef4444"
        draw3.rounded_rectangle([(x1, y1), (x1+140, y1+80)], radius=6, fill=color, outline="#1f2937", width=2)
        # Axis labels
        if row == 4:
            draw3.text((x1+50, y1+90), f"R{col+1}", fill="#9ca3af")
        if col == 0:
            draw3.text((x1-40, y1+30), f"C{row+1}", fill="#9ca3af")
# Axis titles
draw3.text((560, 30), "Financial Return →", fill="#e5e7eb")
draw3.text((80, 300), "Operational Risk ↑", fill="#e5e7eb")
img3.save("public/images/capex-asset-downtime-matrix/hero.png")

print("Hero images created successfully")
PYEOF