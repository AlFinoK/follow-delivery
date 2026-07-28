# Готовит оттиск печати для PDF-накладной из фотографии штампа.
#
#   .\scripts\build-stamp.ps1 <путь-к-фото> [-Out public\stamp.png]
#
# Что делает: выбивает бумагу в прозрачность (остаётся только краска с натуральной
# текстурой), обрезает по краске и ПРОВЕРЯЕТ целостность рамки — все четыре линии
# должны быть непрерывными. Разрешение НЕ уменьшается: линия рамки тонкая, при
# масштабировании она смешивается с прозрачным фоном и пропадает.
#
# Утилита для разработчика (Windows, System.Drawing), в сборку не входит.
param(
	[Parameter(Mandatory = $true)][string]$Source,
	[string]$Out = "public\stamp.png",
	# Порог «краски»: чем ниже, тем больше слабой краски сохраняется (и больше шума бумаги)
	[int]$InkFloor = 7,
	[double]$Gain = 3.2,
	# Прямоугольник для затирки посторонних пометок, в долях кадра: x0,x1,y0,y1
	[double[]]$Erase = @()
)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class StampResult
{
    public int Width, Height;
    public double TopCover, BottomCover, LeftCover, RightCover;
    public string Error = "";
}

public static class StampBuilder
{
    static int Blueness(byte r, byte g, byte b) { return b - (r + g) / 2; }
    static double Lum(byte r, byte g, byte b) { return 0.299 * r + 0.587 * g + 0.114 * b; }

    public static StampResult Run(string src, string dst, int inkFloor, double gain, double[] erase)
    {
        var res = new StampResult();
        using (Bitmap bmp = new Bitmap(src))
        {
            int w = bmp.Width, h = bmp.Height;
            BitmapData bd = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            int stride = bd.Stride;
            byte[] px = new byte[stride * h];
            Marshal.Copy(bd.Scan0, px, 0, px.Length);
            bmp.UnlockBits(bd);

            // уровень бумаги — 90-й процентиль яркости
            int[] hist = new int[256];
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    int i = y * stride + x * 4;
                    hist[(int)Lum(px[i + 2], px[i + 1], px[i])]++;
                }
            int total = w * h, acc = 0, paper = 255;
            for (int v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.90) { paper = Math.Max(v, 40); break; } }

            // альфа: насколько пиксель темнее бумаги; тёплые тени бумаги отбрасываем
            byte[] alpha = new byte[w * h];
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    int i = y * stride + x * 4;
                    byte b = px[i], g = px[i + 1], r = px[i + 2];
                    int a = 0;
                    if (b + 4 >= r) // краска синяя/нейтральная, а не тёплая тень
                    {
                        double dark = (paper - Lum(r, g, b)) / (double)paper * 255.0;
                        double blue = Blueness(r, g, b) * 2.2;
                        double v = Math.Max(dark, blue) - inkFloor;
                        a = (int)Math.Round(v * gain / 3.2 * 1.0);
                        if (a < 0) a = 0; if (a > 255) a = 255;
                    }
                    alpha[y * w + x] = (byte)a;
                }

            // границы краски
            int minX = w, minY = h, maxX = -1, maxY = -1;
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                    if (alpha[y * w + x] > 70)
                    {
                        if (x < minX) minX = x; if (x > maxX) maxX = x;
                        if (y < minY) minY = y; if (y > maxY) maxY = y;
                    }
            if (maxX < 0) { res.Error = "краска не найдена"; return res; }
            int pad = 3;
            minX = Math.Max(0, minX - pad); minY = Math.Max(0, minY - pad);
            maxX = Math.Min(w - 1, maxX + pad); maxY = Math.Min(h - 1, maxY + pad);
            int cw = maxX - minX + 1, ch = maxY - minY + 1;

            using (Bitmap outBmp = new Bitmap(cw, ch, PixelFormat.Format32bppArgb))
            {
                BitmapData od = outBmp.LockBits(new Rectangle(0, 0, cw, ch), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                byte[] o = new byte[od.Stride * ch];
                bool doErase = erase != null && erase.Length == 4;
                for (int y = 0; y < ch; y++)
                    for (int x = 0; x < cw; x++)
                    {
                        int a = alpha[(y + minY) * w + (x + minX)];
                        if (doErase)
                        {
                            double fx = (double)x / cw, fy = (double)y / ch;
                            if (fx >= erase[0] && fx <= erase[1] && fy >= erase[2] && fy <= erase[3]) a = 0;
                        }
                        int j = y * od.Stride + x * 4;
                        o[j] = 207; o[j + 1] = 71; o[j + 2] = 31; o[j + 3] = (byte)a;
                    }
                Marshal.Copy(o, 0, od.Scan0, o.Length);
                outBmp.UnlockBits(od);
                outBmp.Save(dst, ImageFormat.Png);

                // проверка целостности рамки: доля закрашенных точек вдоль каждой линии
                res.Width = cw; res.Height = ch;
                res.TopCover = LineCover(o, od.Stride, cw, ch, true, 0, 0.10);
                res.BottomCover = LineCover(o, od.Stride, cw, ch, true, ch - 1, 0.10);
                res.LeftCover = LineCover(o, od.Stride, cw, ch, false, 0, 0.10);
                res.RightCover = LineCover(o, od.Stride, cw, ch, false, cw - 1, 0.10);
            }
        }
        return res;
    }

    // Доля точек линии, где есть краска. Линию ищем в полосе шириной band от края.
    static double LineCover(byte[] o, int stride, int cw, int ch, bool horizontal, int edge, double band)
    {
        int len = horizontal ? cw : ch;
        int depth = (int)Math.Max(3, (horizontal ? ch : cw) * band);
        int hit = 0;
        for (int i = 0; i < len; i++)
        {
            bool found = false;
            for (int d = 0; d < depth && !found; d++)
            {
                int x = horizontal ? i : (edge == 0 ? d : cw - 1 - d);
                int y = horizontal ? (edge == 0 ? d : ch - 1 - d) : i;
                if (o[y * stride + x * 4 + 3] > 60) found = true;
            }
            if (found) hit++;
        }
        return (double)hit / len;
    }
}
'@

if (-not (Test-Path $Source)) { Write-Error "нет файла: $Source"; exit 1 }
$r = [StampBuilder]::Run((Resolve-Path $Source).Path, (Join-Path $PWD $Out), $InkFloor, $Gain, $Erase)
if ($r.Error) { Write-Error $r.Error; exit 1 }

"{0}: {1}x{2}, {3} КБ" -f $Out, $r.Width, $r.Height, [math]::Round((Get-Item (Join-Path $PWD $Out)).Length / 1KB, 1)
"целостность рамки: верх {0:P0}, низ {1:P0}, лево {2:P0}, право {3:P0}" -f $r.TopCover, $r.BottomCover, $r.LeftCover, $r.RightCover
$bad = @()
if ($r.TopCover -lt 0.85) { $bad += "верх" }
if ($r.BottomCover -lt 0.85) { $bad += "низ" }
if ($r.LeftCover -lt 0.85) { $bad += "лево" }
if ($r.RightCover -lt 0.85) { $bad += "право" }
if ($bad.Count) {
	Write-Warning ("рамка неполная: " + ($bad -join ', ') + ". Понизьте -InkFloor (сейчас $InkFloor) или снимите фото ровнее/светлее.")
	exit 2
}
"рамка целая"
