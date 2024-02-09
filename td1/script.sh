#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: $0 <keyword>"
    exit 1
fi

keyword=$1

search_url="https://www.stocklib.fr/search?keyword=$keyword"
search_html=$(curl -s "$search_url")

echo "$search_html" > search_results.html

image_urls=$(echo "$search_html" | grep -o '<img [^>]*src="[^"]*\.jpg"' | sed -e 's/.*src="\([^"]*\)".*/\1/' | uniq)



echo "$image_urls" > image_urls.txt

mkdir -p images
cd images || exit
echo "$image_urls" | xargs -n 1 -P 8 curl -s -O -J

echo "Téléchargement terminé. Les images sont enregistrées dans le répertoire 'images'."
