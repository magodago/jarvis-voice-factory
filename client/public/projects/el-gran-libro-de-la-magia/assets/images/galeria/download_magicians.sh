#!/bin/bash
# Download Spanish magician photos from Wikipedia
# With proper UA, delays, and multiple search strategies

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Use a proper browser UA for all requests
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Define magicians: filename => array of search terms (tried in order)
# Format: FILENAME|SEARCH_TERM_1|SEARCH_TERM_2|...
SEARCHES=(
  "jorge-blass.jpg|Jorge Blass|Jorge_Blass"
  "jandro.jpg|Jandro|Alejandro López mago"
  "pepe-carroll.jpg|Pepe Carroll|Pepe_Carroll"
  "dani-daortiz.jpg|Dani DaOrtiz|Dani_DaOrtiz"
  "gabi-pareras.jpg|Gabi Pareras|Gabi_Pareras"
  "luis-piedrahita.jpg|Luis Piedrahita|Luis_Piedrahíta|Luis_Piedrahita"
  "jorge-luengo.jpg|Jorge Luengo|Jorge_Luengo"
  "frakson.jpg|Frakson|Francisco González mago"
  "mag-lari.jpg|Mag Lari|Mag_Lari"
  "woody-aragon.jpg|Woody Aragón|Woody_Aragón"
  "antonio-diaz.jpg|Antonio Díaz ilusionista|Antonio_Díaz_(ilusionista)"
  "hector-mancha.jpg|Héctor Mancha|Héctor_Mancha"
  "miguel-puga.jpg|Miguel Puga|Miguel_Puga"
  "yunke.jpg|Yunke|Yunke mago|Yunke_(mago)"
  "miguel-angel-gea.jpg|Miguel Ángel Gea|Miguel_Ángel_Gea"
  "ramon-rioboo.jpg|Ramón Riobóo|Ramón_Riobóo"
  "kiko-pastur.jpg|Kiko Pastur|Kiko_Pastur"
  "toni-bright.jpg|Toni Bright|Toni_Bright"
  "xuso.jpg|El Mago Xuso|Xuso|Mago_Xuso"
  "jose-letamendi.jpg|José de Letamendi|José_de_Letamendi"
  "pepe-mago.jpg|Pepe el Mago|Pepe_el_Mago"
  "gran-alexander.jpg|Gran Alexander|Gran_Alexander"
  "rafa-villar.jpg|Rafa G. Villar|Rafa_G._Villar|Rafa_Villar"
  "jose-aria-aragones.jpg|José María Aragonés|José_María_Aragonés"
  "inmagic.jpg|Inmagic|Inmagic mago"
  "dakris.jpg|Dakris|Dakris mago"
  "anthony-blake.jpg|Anthony Blake mago|Anthony_Blake_(mago)"
)

download_image() {
  local filename="$1"
  local url="$2"
  
  curl -sL -H "User-Agent: ${UA}" -o "$filename" "$url"
  if [ -f "$filename" ] && [ -s "$filename" ]; then
    local mime=$(file -b --mime-type "$filename" 2>/dev/null)
    if [[ "$mime" == image/* ]]; then
      echo "  ✓ DOWNLOADED: $(file -b "$filename")"
      return 0
    else
      echo "  ✗ Not image (got $mime), removing"
      rm -f "$filename"
      return 1
    fi
  else
    echo "  ✗ Empty/failed download"
    rm -f "$filename"
    return 1
  fi
}

try_summary_api() {
  local search_term="$1"
  local encoded=$(echo "$search_term" | python3 -c "import sys,urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip()))" 2>/dev/null)
  if [ -z "$encoded" ]; then
    encoded=$(echo "$search_term" | sed 's/ /%20/g; s/_/%20/g')
  fi
  local response=$(curl -s -H "User-Agent: ${UA}" "https://es.wikipedia.org/api/rest_v1/page/summary/${encoded}")
  local thumb=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('thumbnail',{}).get('source','') or '')" 2>/dev/null)
  
  # If the API returned a redirect/canonical, try that title
  if [ -z "$thumb" ]; then
    local title=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('title',''))" 2>/dev/null)
    if [ -n "$title" ] && [ "$title" != "$search_term" ]; then
      local title_enc=$(echo "$title" | python3 -c "import sys,urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip()))" 2>/dev/null)
      if [ -n "$title_enc" ]; then
        local resp2=$(curl -s -H "User-Agent: ${UA}" "https://es.wikipedia.org/api/rest_v1/page/summary/${title_enc}")
        local thumb2=$(echo "$resp2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('thumbnail',{}).get('source','') or '')" 2>/dev/null)
        if [ -n "$thumb2" ]; then
          echo "$thumb2"
          return 0
        fi
      fi
    fi
  fi
  
  echo "$thumb"
}

success=0
failed=0
skipped=0

for entry in "${SEARCHES[@]}"; do
  IFS='|' read -ra parts <<< "$entry"
  filename="${parts[0]}"
  
  # Skip if already exists with proper image
  if [ -f "$filename" ] && [ -s "$filename" ]; then
    mime=$(file -b --mime-type "$filename" 2>/dev/null)
    if [[ "$mime" == image/* ]]; then
      echo "=== $filename already exists, skipping ==="
      ((skipped++))
      continue
    fi
  fi
  
  echo "=== $filename ==="
  
  thumb_url=""
  
  # Try each search term
  for ((i=1; i<${#parts[@]}; i++)); do
    term="${parts[$i]}"
    echo "  Searching: $term"
    thumb_url=$(try_summary_api "$term")
    if [ -n "$thumb_url" ]; then
      echo "  Found thumbnail"
      break
    fi
    sleep 2
  done
  
  if [ -n "$thumb_url" ]; then
    echo "  URL: $thumb_url"
    if download_image "$filename" "$thumb_url"; then
      ((success++))
    else
      ((failed++))
    fi
  else
    echo "  ✗ No thumbnail found for $filename"
    ((failed++))
  fi
  
  echo ""
  sleep 3  # Delay between magicians
done

echo "========================================="
echo "Results: $success succeeded, $failed failed, $skipped skipped"
echo "========================================="