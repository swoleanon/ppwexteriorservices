using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

class Knockout {
  static int Main(string[] args) {
    if (args.Length < 2) {
      Console.Error.WriteLine("Usage: knockout <in.jpg> <out.png>");
      return 1;
    }
    using (var src = new Bitmap(args[0])) {
      var w = src.Width;
      var h = src.Height;
      var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
      using (var g = Graphics.FromImage(bmp)) {
        g.DrawImage(src, 0, 0, w, h);
      }

      var rect = new Rectangle(0, 0, w, h);
      var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      int stride = data.Stride;
      byte[] px = new byte[stride * h];
      Marshal.Copy(data.Scan0, px, 0, px.Length);

      bool[] seen = new bool[w * h];
      var q = new Queue<int>();

      Func<int,int,int> maxC = (x, y) => {
        int o = y * stride + x * 4;
        byte b = px[o], gch = px[o + 1], r = px[o + 2];
        int m = r; if (gch > m) m = gch; if (b > m) m = b;
        return m;
      };

      Action<int,int> tryEnqueue = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        int i = y * w + x;
        if (seen[i]) return;
        if (maxC(x, y) > 2) return;
        // Lower torso is cropped through the black shirt — keep that band opaque.
        if (y > (int)(h * 0.72) && x > (int)(w * 0.12) && x < (int)(w * 0.88)) return;
        seen[i] = true;
        q.Enqueue(i);
      };

      // Shirt meets the bottom edge — do not seed from the bottom row.
      for (int x = 0; x < w; x++) tryEnqueue(x, 0);
      for (int y = 0; y < h - 1; y++) { tryEnqueue(0, y); tryEnqueue(w - 1, y); }

      int[] dx = { -1, 1, 0, 0 };
      int[] dy = { 0, 0, -1, 1 };
      while (q.Count > 0) {
        int i = q.Dequeue();
        int x = i % w, y = i / w;
        int o = y * stride + x * 4;
        px[o + 3] = 0;
        for (int k = 0; k < 4; k++) tryEnqueue(x + dx[k], y + dy[k]);
      }

      // Clear leftover backdrop beside the cropped shirt without flooding up into folds.
      for (int y = (int)(h * 0.70); y < h; y++) {
        for (int x = 0; x < w; x++) {
          if (maxC(x, y) > 2) break;
          px[y * stride + x * 4 + 3] = 0;
        }
        for (int x = w - 1; x >= 0; x--) {
          if (maxC(x, y) > 2) break;
          px[y * stride + x * 4 + 3] = 0;
        }
      }

      // Peel a thin dark fringe on the silhouette without eating shirt folds.
      for (int pass = 0; pass < 2; pass++) {
        byte[] alpha = new byte[w * h];
        for (int y = 0; y < h; y++)
          for (int x = 0; x < w; x++)
            alpha[y * w + x] = px[y * stride + x * 4 + 3];

        for (int y = 1; y < h - 1; y++) {
          for (int x = 1; x < w - 1; x++) {
            int i = y * w + x;
            if (alpha[i] == 0) continue;
            if (y > (int)(h * 0.78) && x > (int)(w * 0.12) && x < (int)(w * 0.88)) continue;
            if (maxC(x, y) > 10) continue;
            bool nearClear =
              alpha[i - 1] == 0 || alpha[i + 1] == 0 ||
              alpha[i - w] == 0 || alpha[i + w] == 0;
            if (nearClear) px[y * stride + x * 4 + 3] = 0;
          }
        }
      }

      // Crop to opaque bounds
      int minX = w, minY = h, maxX = 0, maxY = 0;
      for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
          if (px[y * stride + x * 4 + 3] == 0) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }

      Marshal.Copy(px, 0, data.Scan0, px.Length);
      bmp.UnlockBits(data);

      int pad = 8;
      minX = Math.Max(0, minX - pad);
      minY = Math.Max(0, minY - pad);
      maxX = Math.Min(w - 1, maxX + pad);
      maxY = Math.Min(h - 1, maxY + pad);
      int cw = maxX - minX + 1;
      int ch = maxY - minY + 1;
      using (var cropped = bmp.Clone(new Rectangle(minX, minY, cw, ch), PixelFormat.Format32bppArgb)) {
        cropped.Save(args[1], ImageFormat.Png);
      }
      bmp.Dispose();
      Console.WriteLine("Wrote " + args[1] + " (" + cw + "x" + ch + ")");
    }
    return 0;
  }
}
