echo "Updating bundle..."
# We append the new sprite sheet to the existing assets.js but we need to match the format
# Actually, easier to just regenerate the whole file with the new asset included.

echo "const ASSETS = {" > assets.js

echo "Processing dragon..."
printf '    dragon: "data:image/png;base64,' >> assets.js
openssl base64 -in assets/dragon.png | tr -d '\n' >> assets.js
printf '",\n' >> assets.js

echo "Processing dragon sheet..."
printf '    dragonSheet: "data:image/png;base64,' >> assets.js
openssl base64 -in assets/dragon_sheet.png | tr -d '\n' >> assets.js
printf '",\n' >> assets.js

echo "Processing hunter..."
printf '    hunter: "data:image/png;base64,' >> assets.js
openssl base64 -in assets/hunter.png | tr -d '\n' >> assets.js
printf '",\n' >> assets.js

echo "Processing fireball..."
printf '    fireball: "data:image/png;base64,' >> assets.js
openssl base64 -in assets/fireball.png | tr -d '\n' >> assets.js
printf '",\n' >> assets.js

echo "Processing sky..."
printf '    sky: "data:image/png;base64,' >> assets.js
openssl base64 -in assets/sky.png | tr -d '\n' >> assets.js
printf '"\n' >> assets.js

echo "};" >> assets.js
echo "Assets updated."
