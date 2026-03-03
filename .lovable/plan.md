

## Problem

The Gemini API (free tier) is returning 429 (Rate Limit Exceeded) on nearly every request. The free tier has strict limits (~15 requests per minute). Typing triggers debounced requests that quickly exhaust this limit.

## Root Cause

1. **No caching**: Same word looked up multiple times hits the API every time
2. **No retry**: When 429 occurs, the function immediately returns the error instead of waiting and retrying
3. **Debounce too short**: 900ms-1200ms debounce still generates many requests during typing

## Plan

### 1. Add in-memory cache + retry logic to the edge function

**File: `supabase/functions/get-word-meaning/index.ts`**

- Add a `Map<string, result>` cache at module level (persists during warm instances)
- When a word is requested, check cache first -- if found, return cached result immediately (zero API calls)
- When Gemini returns 429, retry up to 2 times with exponential backoff (2s, 4s delay)
- Cache successful results for the lifetime of the warm instance

### 2. Increase debounce and add stricter client-side guards

**Files: `src/pages/CreateVocabulary.tsx`, `src/pages/EditVocabulary.tsx`, `src/components/WordManager.tsx`**

- Increase debounce to **1500ms** across all pages
- Increase minimum word length to **3 characters** to avoid junk lookups like "Jj"
- Add cooldown tracking in EditVocabulary (already exists in CreateVocabulary)

### Technical Details

Edge function cache structure:
```text
Module-level Map: word (lowercase) → { meaning, example, part_of_speech, pronunciation }
```

Retry logic: on 429, wait 2s then retry once. If still 429, wait 4s and retry once more. If still failing, return the 429 to the client.

