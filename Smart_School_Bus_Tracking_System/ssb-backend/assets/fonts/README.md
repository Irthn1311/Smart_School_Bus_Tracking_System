Vietnamese PDF fonts

To fix Vietnamese diacritics in PDF reports, place Unicode TTF fonts here.
Recommended: Noto Sans (free from Google Fonts).

Steps:
1. Download Noto Sans TTF files:
   - NotoSans-Regular.ttf
   - NotoSans-Bold.ttf
2. Copy them into this folder: ssb-backend/assets/fonts
3. Restart the backend server.

The code will automatically use these fonts if present, and fall back to default fonts otherwise.