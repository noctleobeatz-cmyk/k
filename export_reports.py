import os
import time
from google import genai
from google.genai import errors as exceptions

# Klucze API NIE mogą być wpisane na stałe w kodzie (to trafia do repo/historii
# i każdy, kto zobaczy ten plik, może ich użyć). Podaj je w zmiennej środowiskowej
# GEMINI_API_KEYS, oddzielone przecinkami, np.:
#   export GEMINI_API_KEYS="klucz1,klucz2,klucz3"
API_KEY = [k.strip() for k in os.environ.get("GEMINI_API_KEYS", "").split(",") if k.strip()]

if not API_KEY:
    print("UWAGA: brak kluczy API. Ustaw zmienną środowiskową GEMINI_API_KEYS.")

def generuj_z_rotacja(prompt, model="gemini-2.5-flash"):

    for klucz in API_KEY:
        try:
            client = genai.Client(api_key=klucz)
            response = client.models.generate_content(model=model, contents=prompt)
            return response.text 
        except Exception as e:
            if "429" in str(e):
                time.sleep(1)
                continue 
            else:
                print(f"Inny błąd na kluczu {klucz[:8]}: {e}")
                continue
            
    return "Niestety, nie udało się uzyskać odpowiedzi z żadnego klucza."

def pobierz_embedding_z_rotacja(tekst, model="text-embedding-004"):
    for klucz in API_KEY:
        try:
            client = genai.Client(api_key=klucz)
            result = client.models.embed_content(model=model, contents=tekst)
            return result.embeddings[0].values
        except Exception as e:
            print(f"Błąd embeddingu na kluczu {klucz[:8]}: {e}")
            continue
    return None

if __name__ == "__main__":
    prompt = generuj_z_rotacja("przywitaj sie")
    print(prompt)