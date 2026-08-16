from PIL import Image

def crop_and_generate_favicons():
    # Load original logo
    img = Image.open('images/logo-kibounoie.png').convert("RGBA")
    
    # Get bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    # Make it square by adding transparent padding if needed
    width, height = img.size
    size = max(width, height)
    new_img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    new_img.paste(img, ((size - width) // 2, (size - height) // 2))
    img = new_img
    
    # Generate requested sizes
    sizes = {
        'favicon-16x16.png': 16,
        'favicon-32x32.png': 32,
        'apple-touch-icon.png': 180,
        'favicon-192x192.png': 192,
        'favicon-512x512.png': 512
    }
    
    for filename, s in sizes.items():
        resized = img.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(f'images/{filename}', format='PNG')
        
    # Generate favicon.ico (includes multiple sizes ideally, but saving 32x32 as .ico is fine for now, or multiple if supported)
    ico_img = img.resize((32, 32), Image.Resampling.LANCZOS)
    ico_img.save('favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

if __name__ == '__main__':
    crop_and_generate_favicons()
