import asyncio
from playwright.async_api import async_playwright

async def mermaid_to_png(html_path, png_path, width=1800, scale=2):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            viewport={'width': width, 'height': 1500},
            device_scale_factor=scale
        )
        await page.goto(f'file://{html_path}', wait_until='load', timeout=30000)
        
        # Wait for Mermaid SVG to render
        await page.wait_for_selector('#diagram svg', timeout=15000)
        await page.wait_for_timeout(2000)
        
        # Read SVG's ACTUAL rendered size
        svg_size = await page.evaluate('''() => {
            const svg = document.querySelector('#diagram svg');
            if (!svg) return null;
            const r = svg.getBoundingClientRect();
            return { width: r.width, height: r.height };
        }''')
        
        el = page.locator('#diagram')
        css_bbox = await el.bounding_box()
        
        svg_w = svg_size['width'] if svg_size else width
        svg_h = svg_size['height'] if svg_size else 1500
        css_w = css_bbox['width'] if css_bbox else width
        css_h = css_bbox['height'] if css_bbox else 1500
        
        # Use the LARGER of CSS box and SVG actual size
        fit_w = max(width, int(max(svg_w, css_w) + 200))
        fit_h = int(max(svg_h, css_h) + 200)
        
        await page.set_viewport_size({'width': fit_w, 'height': fit_h})
        await page.wait_for_timeout(500)
        
        await el.screenshot(path=png_path)
        await browser.close()
        
        import os
        print(f'✅ {png_path} ({os.path.getsize(png_path)/1024:.0f}KB)')

async def main():
    tasks = [
        mermaid_to_png(
            '/home/z/my-project/download/tracking-flow-sequence.html',
            '/home/z/my-project/download/tracking-flow-sequence.png'
        ),
        mermaid_to_png(
            '/home/z/my-project/download/dispute-flow-sequence.html',
            '/home/z/my-project/download/dispute-flow-sequence.png'
        ),
        mermaid_to_png(
            '/home/z/my-project/download/ml-featurestore-flow-sequence.html',
            '/home/z/my-project/download/ml-featurestore-flow-sequence.png'
        ),
    ]
    await asyncio.gather(*tasks)

asyncio.run(main())
