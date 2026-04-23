#!/usr/bin/env python3
"""
Render CargoBit Sequence Diagram HTML to PNG
"""
import asyncio
import os
from playwright.async_api import async_playwright

async def render_diagram():
    html_path = '/home/z/my-project/download/cargobit-sequence-diagram.html'
    output_path = '/home/z/my-project/download/cargobit-sequence-diagram.png'
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            viewport={'width': 1200, 'height': 3200},
            device_scale_factor=2
        )
        
        await page.goto(f'file://{html_path}', wait_until='networkidle')
        await page.wait_for_timeout(500)
        
        # Get the root element and its bounding box
        el = page.locator('#root')
        bbox = await el.bounding_box()
        
        if bbox:
            # Resize viewport to fit content
            fit_w = max(1200, int(bbox['width'] + 100))
            fit_h = int(bbox['height'] + 100)
            await page.set_viewport_size({'width': fit_w, 'height': fit_h})
            await page.wait_for_timeout(200)
        
        # Take screenshot
        await el.screenshot(path=output_path)
        
        await browser.close()
        
        # Get file size
        size_kb = os.path.getsize(output_path) / 1024
        print(f'✅ Rendered: {output_path}')
        print(f'   Size: {size_kb:.1f} KB')
        print(f'   Dimensions: {fit_w}x{fit_h}px')

if __name__ == '__main__':
    asyncio.run(render_diagram())
