# Восстанавливает рамку оттиска печати (public/stamp.png).
#
#   .\scripts\fix-stamp-frame.ps1 [-File public\stamp.png] [-Thickness 7]
#
# Зачем: на фото штампа краска рамки легла неровно, местами линии почти нет —
# в документе это видно как «рваные бордеры». Скрипт подгоняет прямые по уцелевшим
# фрагментам каждой из четырёх сторон, стирает обрывки и рисует линии заново.
#
# Рамка восстанавливается ЧЕТЫРЁХУГОЛЬНИКОМ по фактическим линиям, а не
# прямоугольником: фото снято под углом, у оттиска перспектива (верх идёт с y=16
# до y=5, правая сторона с x=740 до x=756), и ровный прямоугольник не совпал бы
# с наклоном текста.
#
# Толщина 7px подобрана не «на глаз»: в накладной картинка сжимается с 760 до ~234px,
# поэтому линия 3px становится тоньше пикселя, браузер её размазывает и на печати она
# рябит. 7px дают ~2px в документе — плотная линия под вес букв (9px уже тяжелее текста).
#
# Утилита для разработчика (Windows, System.Drawing), в сборку не входит.
# Код на C# 5: Add-Type в PowerShell 5.1 не понимает локальные функции и новее.
param(
	[string]$File = "public\stamp.png",
	[int]$Thickness = 7,
	[int]$Alpha = 240,
	# Зона у рамки, где текста заведомо нет — там чистим всё (обрывки, кляксы)
	[int]$Inset = 14,
	# Только повернуть оттиск так, чтобы линии рамки стали горизонтальными
	[switch]$Deskew,
	# Рисовать рамку строго прямоугольной (после -Deskew остаётся лёгкая перспектива)
	[switch]$Straight
)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class FrameFix
{
    public string Report = "";
    public double TopCover, BottomCover, LeftCover, RightCover;
}

public static class StampFrame
{
    // Коэффициенты прямой b = k*a + c по набору точек, с отбросом выбросов.
    static double[] Fit(List<double> a, List<double> b)
    {
        double k = 0, c = 0;
        for (int pass = 0; pass < 2; pass++)
        {
            int n = a.Count;
            if (n < 2) return new double[] { 0, 0 };
            double sa = 0, sb = 0, sab = 0, saa = 0;
            for (int i = 0; i < n; i++) { sa += a[i]; sb += b[i]; sab += a[i] * b[i]; saa += a[i] * a[i]; }
            double den = n * saa - sa * sa;
            k = den == 0 ? 0 : (n * sab - sa * sb) / den;
            c = (sb - k * sa) / n;
            if (pass == 1) break;

            List<double> dev = new List<double>();
            for (int i = 0; i < n; i++) dev.Add(Math.Abs(b[i] - (k * a[i] + c)));
            List<double> sorted = new List<double>(dev);
            sorted.Sort();
            double med = sorted[sorted.Count / 2] + 0.5;
            List<double> na = new List<double>(), nb = new List<double>();
            for (int i = 0; i < n; i++) if (dev[i] <= med * 3) { na.Add(a[i]); nb.Add(b[i]); }
            if (na.Count >= 4) { a = na; b = nb; }
        }
        return new double[] { k, c };
    }

    // Пересечение горизонтальной (y = kh*x + ch) и вертикальной (x = kv*y + cv) прямых.
    static PointF Corner(double kh, double ch, double kv, double cv)
    {
        double x = (kv * ch + cv) / (1 - kv * kh);
        double y = kh * x + ch;
        return new PointF((float)x, (float)y);
    }

    // Поворачивает оттиск так, чтобы линии рамки стали горизонтальными. Угол берём как
    // средний наклон верхней и нижней линий (у фото есть перспектива, они не параллельны).
    public static string Deskew(string file)
    {
        double[] t, bo;
        int w, h;
        using (Bitmap src = new Bitmap(file))
        {
            w = src.Width; h = src.Height;
            byte[,] al = new byte[w, h];
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                    al[x, y] = src.GetPixel(x, y).A;

            int topBand = (int)(h * 0.12), bottomBand = (int)(h * 0.11);
            List<double> tx = new List<double>(), ty = new List<double>();
            List<double> bx = new List<double>(), by = new List<double>();
            for (int x = 0; x < w; x += 4)
            {
                for (int y = 0; y < topBand; y++) if (al[x, y] > 60) { tx.Add(x); ty.Add(y); break; }
                for (int y = h - 1; y >= h - bottomBand; y--) if (al[x, y] > 60) { bx.Add(x); by.Add(y); break; }
            }
            t = Fit(tx, ty); bo = Fit(bx, by);
        }
        double slope = (t[0] + bo[0]) / 2.0;
        double angle = Math.Atan(slope) * 180.0 / Math.PI;
        if (Math.Abs(angle) < 0.05) return string.Format("наклон {0:0.00}° — поворот не нужен", angle);

        string tmp = file + ".tmp";
        using (Bitmap src = new Bitmap(file))
        using (Bitmap dst = new Bitmap(w, h, PixelFormat.Format32bppArgb))
        {
            using (Graphics g = Graphics.FromImage(dst))
            {
                g.Clear(Color.Transparent);
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.SmoothingMode = SmoothingMode.HighQuality;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.TranslateTransform(w / 2f, h / 2f);
                g.RotateTransform((float)(-angle));
                g.TranslateTransform(-w / 2f, -h / 2f);
                g.DrawImage(src, 0, 0, w, h);
            }
            dst.Save(tmp, ImageFormat.Png);
        }
        System.IO.File.Delete(file);
        System.IO.File.Move(tmp, file);
        return string.Format("повернул на {0:0.00}° (наклон линий рамки был {1:0.0000})", -angle, slope);
    }

    public static FrameFix Run(string file, int thickness, int alpha, int inset, bool straight)
    {
        FrameFix res = new FrameFix();
        int w, h;
        byte[,] al;
        using (Bitmap src = new Bitmap(file))
        {
            w = src.Width; h = src.Height;
            al = new byte[w, h];
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                    al[x, y] = src.GetPixel(x, y).A;
        }

        // полосы у краёв, где заведомо нет текста
        int topBand = (int)(h * 0.12), bottomBand = (int)(h * 0.11);
        int leftBand = (int)(w * 0.05), rightBand = (int)(w * 0.05);

        List<double> tx = new List<double>(), ty = new List<double>();
        List<double> bx = new List<double>(), by = new List<double>();
        List<double> ly = new List<double>(), lx = new List<double>();
        List<double> ry = new List<double>(), rx = new List<double>();

        for (int x = 0; x < w; x += 4)
        {
            for (int y = 0; y < topBand; y++) if (al[x, y] > 60) { tx.Add(x); ty.Add(y); break; }
            for (int y = h - 1; y >= h - bottomBand; y--) if (al[x, y] > 60) { bx.Add(x); by.Add(y); break; }
        }
        for (int y = 0; y < h; y += 4)
        {
            for (int x = 0; x < leftBand; x++) if (al[x, y] > 60) { ly.Add(y); lx.Add(x); break; }
            for (int x = w - 1; x >= w - rightBand; x--) if (al[x, y] > 60) { ry.Add(y); rx.Add(x); break; }
        }

        double[] t = Fit(tx, ty), bo = Fit(bx, by), l = Fit(ly, lx), r = Fit(ry, rx);

        // -Straight: рамка строго прямоугольная. После поворота остаётся лёгкая
        // перспектива (верх и низ фото не параллельны), и в документе рядом с ровными
        // линиями таблиц она читается как перекос. Берём значение подогнанной прямой
        // в середине стороны и обнуляем наклон.
        if (straight)
        {
            t = new double[] { 0, t[0] * (w / 2.0) + t[1] };
            bo = new double[] { 0, bo[0] * (w / 2.0) + bo[1] };
            l = new double[] { 0, l[0] * (h / 2.0) + l[1] };
            r = new double[] { 0, r[0] * (h / 2.0) + r[1] };
        }

        res.Report = string.Format(
            "точек: верх {0}, низ {1}, лево {2}, право {3}" + Environment.NewLine +
            "верх:  y = {4:0.0000}x + {5:0.0}" + Environment.NewLine +
            "низ:   y = {6:0.0000}x + {7:0.0}" + Environment.NewLine +
            "лево:  x = {8:0.0000}y + {9:0.0}" + Environment.NewLine +
            "право: x = {10:0.0000}y + {11:0.0}",
            tx.Count, bx.Count, ly.Count, ry.Count, t[0], t[1], bo[0], bo[1], l[0], l[1], r[0], r[1]);

        PointF tl = Corner(t[0], t[1], l[0], l[1]);
        PointF tr = Corner(t[0], t[1], r[0], r[1]);
        PointF bl = Corner(bo[0], bo[1], l[0], l[1]);
        PointF br = Corner(bo[0], bo[1], r[0], r[1]);
        res.Report += Environment.NewLine + string.Format("углы: ({0:0},{1:0}) ({2:0},{3:0}) ({4:0},{5:0}) ({6:0},{7:0})",
            tl.X, tl.Y, tr.X, tr.Y, br.X, br.Y, bl.X, bl.Y);

        // Полосы ЗАТИРКИ считаем по самим линиям рамки, а не «на глаз»: широкая полоса
        // срезала бы верх первой строки текста (она начинается сразу под рамкой).
        int margin = thickness + 2;
        int eraseTop = (int)Math.Ceiling(Math.Max(t[1], t[0] * w + t[1])) + margin;
        int eraseBottom = (int)Math.Floor(Math.Min(bo[1], bo[0] * w + bo[1])) - margin;
        int eraseLeft = (int)Math.Ceiling(Math.Max(l[1], l[0] * h + l[1])) + margin;
        int eraseRight = (int)Math.Floor(Math.Min(r[1], r[0] * h + r[1])) - margin;

        // Границы ТЕКСТА. Считаем только ТОЛСТУЮ краску (плотное окружение 5×5): линии
        // рамки и её обрывки тонкие, и если принять их за текст, зачистка углов
        // схлопнется до нуля и кляксы у углов останутся.
        int txMinX = w, txMaxX = 0, txMinY = h, txMaxY = 0;
        for (int y = 2; y < h - 2; y++)
            for (int x = 2; x < w - 2; x++)
            {
                if (al[x, y] <= 60) continue;
                if (y <= eraseTop || y >= eraseBottom || x <= eraseLeft || x >= eraseRight) continue;
                int dense = 0;
                for (int dy = -2; dy <= 2; dy++)
                    for (int dx = -2; dx <= 2; dx++)
                        if (al[x + dx, y + dy] > 60) dense++;
                if (dense < 15) continue; // тонкая линия — это не текст
                if (x < txMinX) txMinX = x;
                if (x > txMaxX) txMaxX = x;
                if (y < txMinY) txMinY = y;
                if (y > txMaxY) txMaxY = y;
            }
        // В углах текста нет (он отступает от рамки), а вот кляксы от старой рамки есть —
        // чистим квадраты по углам, иначе рядом с новой линией остаются засечки.
        // Размер квадрата фиксированный: клякса от старой рамки такая же толстая, как
        // буквы, поэтому «по толщине» её не отличить. Текст отступает от рамки
        // (первая строка начинается с x≈45), так что 4.5% ширины его не задевают.
        int corner = (int)(w * 0.045);

        res.Report += Environment.NewLine + string.Format(
            "затирка: y<{0}, y>{1}, x<{2}, x>{3}, углы {4}px | текст: x {5}..{6}, y {7}..{8}",
            eraseTop, eraseBottom, eraseLeft, eraseRight, corner, txMinX, txMaxX, txMinY, txMaxY);
        if (txMinY < eraseTop || txMaxY > eraseBottom || txMinX < eraseLeft || txMaxX > eraseRight)
            res.Report += Environment.NewLine + "ВНИМАНИЕ: полоса затирки перекрывает текст";

        string tmp = file + ".tmp";
        using (Bitmap bmp = new Bitmap(file))
        using (Bitmap outBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb))
        {
            // 1) Переносим только текст. Чистим всё, что ближе inset пикселей к любой из
            //    линий рамки: текст оттиска к рамке так близко не подходит, поэтому в этой
            //    зоне заведомо лежат только обрывки старой рамки и кляксы в углах.
            //    Полосы у краёв оставляем как внешний ограничитель.
            for (int y = 0; y < h; y++)
                for (int x = 0; x < w; x++)
                {
                    double dTop = y - (t[0] * x + t[1]);
                    double dBottom = (bo[0] * x + bo[1]) - y;
                    double dLeft = x - (l[0] * y + l[1]);
                    double dRight = (r[0] * y + r[1]) - x;
                    bool nearFrame = dTop < inset || dBottom < inset || dLeft < inset || dRight < inset;
                    bool inBand = y <= eraseTop || y >= eraseBottom || x <= eraseLeft || x >= eraseRight;
                    bool inCorner = (x < corner || x >= w - corner) && (y < corner || y >= h - corner);
                    outBmp.SetPixel(x, y, nearFrame || inBand || inCorner ? Color.FromArgb(0, 31, 71, 207) : bmp.GetPixel(x, y));
                }

            // 2) рисуем рамку заново — сами, по пикселям. GDI+ со сглаживанием и
            //    стыками кладёт линии не ровно по расчётным координатам, а нам нужна
            //    точность: линия должна лечь именно туда, где она была на оттиске.
            Color ink = Color.FromArgb(alpha, 31, 71, 207);
            int half = thickness / 2;
            for (int x = 0; x < w; x++)
            {
                if (x >= tl.X - 1 && x <= tr.X + 1) Dot(outBmp, x, (int)Math.Round(t[0] * x + t[1]), half, ink, false);
                if (x >= bl.X - 1 && x <= br.X + 1) Dot(outBmp, x, (int)Math.Round(bo[0] * x + bo[1]), half, ink, false);
            }
            for (int y = 0; y < h; y++)
            {
                if (y >= tl.Y - 1 && y <= bl.Y + 1) Dot(outBmp, (int)Math.Round(l[0] * y + l[1]), y, half, ink, true);
                if (y >= tr.Y - 1 && y <= br.Y + 1) Dot(outBmp, (int)Math.Round(r[0] * y + r[1]), y, half, ink, true);
            }
            outBmp.Save(tmp, ImageFormat.Png);

            // Целостность мерим ВДОЛЬ СВОИХ рёбер (между углами), а не по всей ширине
            // кадра: рамка законно заканчивается в углах, а не у границы картинки.
            res.TopCover = Cover(outBmp, true, 0, topBand, (int)tl.X, (int)tr.X);
            res.BottomCover = Cover(outBmp, true, 1, bottomBand, (int)bl.X, (int)br.X);
            res.LeftCover = Cover(outBmp, false, 0, leftBand, (int)tl.Y, (int)bl.Y);
            res.RightCover = Cover(outBmp, false, 1, rightBand, (int)tr.Y, (int)br.Y);
        }
        System.IO.File.Delete(file);
        System.IO.File.Move(tmp, file);
        return res;
    }

    // Ставит точку линии толщиной 2*half+1: по вертикали для горизонтальных линий и наоборот.
    static void Dot(Bitmap b, int x, int y, int half, Color ink, bool vertical)
    {
        for (int d = -half; d <= half; d++)
        {
            int px = vertical ? x + d : x;
            int py = vertical ? y : y + d;
            if (px >= 0 && py >= 0 && px < b.Width && py < b.Height) b.SetPixel(px, py, ink);
        }
    }

    // Доля точек ребра (от from до to), где есть краска; ищем в полосе глубиной depth.
    static double Cover(Bitmap b, bool horizontal, int farEdge, int depth, int from, int to)
    {
        int lo = Math.Max(0, Math.Min(from, to)), hi = Math.Min((horizontal ? b.Width : b.Height) - 1, Math.Max(from, to));
        int len = hi - lo + 1;
        int hit = 0;
        for (int i = lo; i <= hi; i++)
        {
            bool found = false;
            for (int d = 0; d < depth && !found; d++)
            {
                int x = horizontal ? i : (farEdge == 0 ? d : b.Width - 1 - d);
                int y = horizontal ? (farEdge == 0 ? d : b.Height - 1 - d) : i;
                if (b.GetPixel(x, y).A > 60) found = true;
            }
            if (found) hit++;
        }
        return (double)hit / len;
    }
}
'@

$path = Join-Path $PWD $File
if (-not (Test-Path $path)) { Write-Error "нет файла: $path"; exit 1 }

if ($Deskew) {
	[StampFrame]::Deskew($path)
	"готово: теперь прогоните ещё раз с -Straight, чтобы перерисовать рамку"
	exit 0
}

$r = [StampFrame]::Run($path, $Thickness, $Alpha, $Inset, [bool]$Straight)
$r.Report
"целостность рамки: верх {0:P0}, низ {1:P0}, лево {2:P0}, право {3:P0}" -f $r.TopCover, $r.BottomCover, $r.LeftCover, $r.RightCover
$bad = @()
if ($r.TopCover -lt 0.97) { $bad += "верх" }
if ($r.BottomCover -lt 0.97) { $bad += "низ" }
if ($r.LeftCover -lt 0.97) { $bad += "лево" }
if ($r.RightCover -lt 0.97) { $bad += "право" }
if ($bad.Count) { Write-Warning ("линии всё ещё рваные: " + ($bad -join ', ')); exit 2 }
"рамка целая"
