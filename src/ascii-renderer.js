// ascii-renderer.js — Render scenes as ASCII art for terminal preview
// Uses Unicode block characters for pseudo-grayscale

const CHARS = ' .:-=+*#%@';
const CHARS_FINE = ' ·.°:;-=+*#%@█';

/**
 * Convert pixel array to ASCII art string
 * @param {Uint8ClampedArray} pixels - RGBA pixel data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {object} options
 * @param {number} options.maxWidth - Max output width in chars (default: 80)
 * @param {boolean} options.color - Use ANSI color codes (default: false)
 * @param {boolean} options.fine - Use fine character set (default: false)
 * @returns {string} - ASCII art
 */
export function pixelsToAscii(pixels, width, height, {
  maxWidth = 80,
  color = false,
  fine = false
} = {}) {
  const chars = fine ? CHARS_FINE : CHARS;
  
  // Calculate scaling
  const scaleX = Math.max(1, Math.ceil(width / maxWidth));
  const scaleY = scaleX * 2; // Chars are ~2x taller than wide
  
  const outWidth = Math.ceil(width / scaleX);
  const outHeight = Math.ceil(height / scaleY);
  
  const lines = [];
  
  for (let oy = 0; oy < outHeight; oy++) {
    let line = '';
    for (let ox = 0; ox < outWidth; ox++) {
      // Average the pixel block
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = 0; dy < scaleY && oy * scaleY + dy < height; dy++) {
        for (let dx = 0; dx < scaleX && ox * scaleX + dx < width; dx++) {
          const px = ox * scaleX + dx;
          const py = oy * scaleY + dy;
          const idx = (py * width + px) * 4;
          r += pixels[idx];
          g += pixels[idx + 1];
          b += pixels[idx + 2];
          count++;
        }
      }
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      
      // Convert to brightness (0-255)
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      const charIdx = Math.min(chars.length - 1, Math.floor(brightness / 256 * chars.length));
      
      if (color) {
        // ANSI 24-bit color
        line += `\x1b[38;2;${r};${g};${b}m${chars[charIdx]}\x1b[0m`;
      } else {
        line += chars[charIdx];
      }
    }
    lines.push(line);
  }
  
  return lines.join('\n');
}

/**
 * Render a scene to ASCII art using SceneBuilder or Renderer
 * @param {object} renderer - Renderer instance
 * @param {object} options - ASCII options
 * @returns {string}
 */
export function renderAscii(renderer, options = {}) {
  const pixels = renderer.render();
  return pixelsToAscii(pixels, renderer.width, renderer.height, options);
}
