# ReRouter by Mubarokah Digital — API Documentation

## 1. Overview

ReRouter menyediakan satu API key untuk mengakses semua model AI yang tersedia di dalam katalognya.

API ini kompatibel dengan format API **OpenAI** dan **Anthropic**, sehingga SDK yang sudah ada dapat digunakan tanpa perubahan besar. Pada umumnya, cukup ubah konfigurasi `base_url` agar mengarah ke ReRouter.

### Fitur utama

- Satu API key untuk semua model.
- Kompatibel dengan OpenAI API.
- Kompatibel dengan Anthropic API.
- Dapat digunakan dengan SDK OpenAI dan Anthropic yang sudah ada.
- Mendukung berbagai jenis model: chat, embedding, dan decision.
- Mendukung streaming, function calling, vision, serta reasoning pada model yang kompatibel.
- Setiap response menyertakan informasi penggunaan token dan biaya dalam USD.
- API key dapat memiliki batas kredit dan daftar model yang diizinkan (*model allow-list*).

### Base URL

```text
https://rerouter.mubarokah.com/v1
```

---

## 2. Authentication

Setiap request API wajib menggunakan API key yang dibuat melalui halaman **API Keys**.

### Membuat API Key

1. Buka halaman **API Keys**.
2. Buat API key baru.
3. Gunakan API key tersebut pada setiap request ke ReRouter.

API key dapat dikonfigurasi dengan dua batasan:

- **Credit limit:** batas maksimum kredit yang dapat digunakan oleh API key.
- **Model allow-list:** daftar model yang diperbolehkan untuk digunakan oleh API key.

### Authentication Headers

ReRouter menerima authentication melalui salah satu dari dua header berikut:

**Option 1 — Authorization Bearer**

```http
Authorization: Bearer sk-...
```

**Option 2 — x-api-key**

```http
x-api-key: sk-...
```

Gunakan API key yang sama secara konsisten pada setiap request.

### Usage and Credit Handling

Setiap response API menyertakan informasi penggunaan, termasuk biaya dalam USD melalui properti:

```json
{
  "usage": {
    "cost": 0.0000315
  }
}
```

Ketentuan penggunaan kredit:

- Biaya penggunaan dilaporkan melalui `usage.cost`.
- Nilai biaya menggunakan mata uang USD.
- Request yang tidak lagi dapat dibiayai oleh kredit yang tersedia akan ditolak dengan HTTP status `402`.
- Output yang panjang akan secara otomatis dibatasi agar tidak melebihi sisa kredit yang tersedia.
- Batas kredit pada API key juga berlaku. Request akan ditolak ketika API key mencapai batas kreditnya.

---

## 3. HTTP Errors and Limits

ReRouter menggunakan HTTP status code berikut untuk menunjukkan kesalahan dan batasan request.

| HTTP Status | Error | Keterangan |
|---|---|---|
| `400` | Bad Request | Request tidak valid, misalnya terdapat field yang wajib tetapi tidak diisi atau model digunakan pada endpoint yang salah. |
| `401` | Unauthorized | API key tidak disertakan, salah, atau sudah dicabut (*revoked*). |
| `402` | Payment Required | Kredit habis atau API key telah mencapai batas kreditnya. |
| `403` | Forbidden | API key tidak diizinkan menggunakan model yang diminta. |
| `404` | Not Found | Model yang diminta tidak ditemukan. |
| `413` | Payload Too Large | Ukuran request body melebihi 32 MB. |
| `429` | Too Many Requests | Rate limit terlampaui. Rate limit berlaku per API key dan juga per akun untuk seluruh API key. |
| `502` | Bad Gateway | Provider model tidak tersedia. Coba ulangi request nanti. |

### Important Error Handling Notes

- `401` menunjukkan masalah autentikasi API key.
- `402` menunjukkan masalah ketersediaan kredit atau batas kredit.
- `403` menunjukkan bahwa API key tidak memiliki izin menggunakan model tertentu.
- `404` menunjukkan bahwa model ID tidak dikenal.
- `429` dapat terjadi karena batas request per key maupun batas akun secara keseluruhan.
- `502` menunjukkan bahwa provider model sedang tidak tersedia. Request dapat dicoba kembali nanti.

---

# 4. API Endpoints

## 4.1. Chat Completions

**API Compatibility:** OpenAI Chat Completions

| Property | Value |
|---|---|
| HTTP Method | `POST` |
| Endpoint | `/v1/chat/completions` |
| Full URL | `https://rerouter.mubarokah.com/v1/chat/completions` |
| API Format | OpenAI Chat Completions |

### Description

Menghasilkan balasan dari daftar pesan (*messages*).

Endpoint ini mendukung:

- Streaming melalui Server-Sent Events (SSE).
- Function calling / tools.
- JSON output.
- Images menggunakan model yang mendukung vision.
- Thinking menggunakan model yang mendukung reasoning.

### Request Parameters

| Parameter | Type | Description |
|---|---|---|
| `model` | `string` | Model ID yang diperoleh dari `GET /v1/models`. |
| `messages` | `array` | Daftar pesan dengan role `system`, `user`, `assistant`, atau `tool`. Konten pesan `user` dapat mencampurkan teks dan bagian `image_url`. |
| `stream` | `boolean` | Mengaktifkan streaming menggunakan Server-Sent Events. Informasi usage, termasuk cost, dikirim pada chunk terakhir. |
| `max_tokens` | `integer` | Batas maksimum output token. |
| `max_completion_tokens` | `integer` | Alternatif batas output token. Nilainya akan otomatis diturunkan jika kredit yang tersedia tidak mencukupi. |
| `temperature` | `number` | Sampling option. Diteruskan kepada model jika didukung. |
| `top_p` | `number` | Sampling option. Diteruskan kepada model jika didukung. |
| `stop` | `array` / `string` | Sampling option. Diteruskan kepada model jika didukung. |
| `seed` | `integer` | Sampling option. Diteruskan kepada model jika didukung. |
| `n` | `integer` | Sampling option. Diteruskan kepada model jika didukung. |
| `tools` | `array` | Konfigurasi function calling / tools. |
| `tool_choice` | `string` / `object` | Mengatur pemilihan tool. |
| `parallel_tool_calls` | `boolean` | Mengatur parallel tool calling. |
| `response_format` | `object` | Format response, misalnya JSON object atau JSON Schema. |
| `reasoning_effort` | `string` | Tingkat reasoning: `low`, `medium`, atau `high`, khusus untuk model yang mendukung thinking. |

### `response_format`

Format JSON object:

```json
{
  "type": "json_object"
}
```

Atau gunakan format `json_schema`.

### `reasoning_effort`

Nilai yang tersedia:

```text
low
medium
high
```

Hanya berlaku pada model yang mendukung fitur thinking.

### Example Request

**cURL**

```bash
curl https://rerouter.mubarokah.com/v1/chat/completions \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5-mini",
    "messages": [
      {
        "role": "user",
        "content": "Halo!"
      }
    ]
  }'
```

### Example Response

```json
{
  "id": "chatcmpl-…",
  "model": "gpt-5-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Halo! Ada yang bisa dibantu?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 12,
    "total_tokens": 21,
    "cost": 0.0000315
  }
}
```

### Response Fields

| Field | Description |
|---|---|
| `id` | ID response. |
| `model` | Model yang digunakan. |
| `choices` | Daftar hasil completion. |
| `choices[].index` | Index hasil completion. |
| `choices[].message.role` | Role pesan response. |
| `choices[].message.content` | Isi pesan yang dihasilkan model. |
| `choices[].finish_reason` | Alasan proses completion selesai. |
| `usage.prompt_tokens` | Jumlah token input. |
| `usage.completion_tokens` | Jumlah token output. |
| `usage.total_tokens` | Jumlah seluruh token. |
| `usage.cost` | Biaya penggunaan dalam USD. |

---

## 4.2. Responses API

**API Compatibility:** OpenAI Responses API

| Property | Value |
|---|---|
| HTTP Method | `POST` |
| Endpoint | `/v1/responses` |
| Full URL | `https://rerouter.mubarokah.com/v1/responses` |
| API Format | OpenAI Responses |

### Description

Responses API merupakan API generasi terbaru dari OpenAI.

Endpoint ini menerima string atau daftar input items dan mendukung:

- Instructions.
- Tools.
- Structured output.
- Input berupa teks.
- Input berupa gambar melalui `input_image`.
- Reasoning pada model yang mendukungnya.
- Streaming menggunakan Server-Sent Events.

### Request Parameters

| Parameter | Type | Description |
|---|---|---|
| `model` | `string` | Model ID yang digunakan. |
| `input` | `string` \| `array` | Input berupa teks atau daftar item yang dapat berisi bagian `input_text` dan `input_image`. |
| `instructions` | `string` | System-level guidance atau instruksi untuk model. |
| `max_output_tokens` | `integer` | Batas maksimum output token. |
| `reasoning` | `object` | Konfigurasi reasoning untuk model yang mendukungnya. |
| `stream` | `boolean` | Mengaktifkan streaming melalui Server-Sent Events. Streaming berakhir dengan event `response.completed`. |

### Reasoning Configuration

Contoh:

```json
{
  "effort": "low"
}
```

Digunakan pada reasoning models.

### Example Request

**cURL**

```bash
curl https://rerouter.mubarokah.com/v1/responses \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5-mini",
    "input": "Write a haiku about Jakarta."
  }'
```

### Model Compatibility and Automatic Fallback

Semua chat model dapat digunakan melalui endpoint ini.

Namun, beberapa provider model tidak menyediakan Responses API secara native, termasuk beberapa varian:

- DeepSeek.
- GLM.

Untuk model-model tersebut, ReRouter secara otomatis melayani request melalui Chat Completions.

Fallback otomatis ini tetap mendukung:

- Streaming.
- Tools.

### Stateless Requests

Responses API pada ReRouter bersifat stateless.

Artinya:

- `previous_response_id` tidak didukung.
- Client harus mengirimkan seluruh riwayat percakapan dalam request berikutnya.
- Jangan mengandalkan penyimpanan konteks percakapan otomatis dari response sebelumnya.

---

## 4.3. Messages API (Anthropic)

**API Compatibility:** Anthropic Messages API

| Property | Value |
|---|---|
| HTTP Method | `POST` |
| Endpoint | `/v1/messages` |
| Full URL | `https://rerouter.mubarokah.com/v1/messages` |
| API Format | Anthropic Messages |

### Description

Endpoint ini menyediakan kompatibilitas dengan Anthropic Messages API.

Dirancang untuk:

- Anthropic SDK.
- Claude Code.
- Penggunaan model Claude.
- Penggunaan chat model lainnya melalui format Anthropic.

Endpoint ini dapat digunakan dengan **semua chat model, tidak hanya model Claude**.

ReRouter menerjemahkan request Anthropic ke format provider model yang sesuai, termasuk fitur:

- Streaming.
- Tools.
- Images.
- Thinking.

### Request Parameters

| Parameter | Type | Description |
|---|---|---|
| `model` | `string` | Chat model ID apa pun. Nama Claude yang menggunakan versi tanggal, misalnya `claude-haiku-4-5-20251001`, akan dipetakan ke nama model dalam katalog. |
| `max_tokens` | `integer` | Batas maksimum output token. Parameter ini wajib digunakan oleh Anthropic SDK. |
| `system` | `string` \| `array` | System prompt. `cache_control` tetap dipertahankan untuk model Claude. |
| `messages` | `array` | Daftar pesan yang mendukung text, image, document, tool_use, dan tool_result blocks. |
| `tools` | `array` | Konfigurasi client tools menggunakan `input_schema`. |
| `tool_choice` | `string` \| `object` | Konfigurasi pemilihan tool. |
| `thinking` | `object` | Konfigurasi thinking untuk reasoning models. |

### Thinking Configuration

Contoh:

```json
{
  "type": "enabled",
  "budget_tokens": 1024
}
```

`budget_tokens` di atas adalah contoh nilai `N`.

Thinking hanya digunakan pada reasoning models.

### Example Request

**cURL**

```bash
curl https://rerouter.mubarokah.com/v1/messages \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-haiku-4-5",
    "max_tokens": 512,
    "messages": [
      {
        "role": "user",
        "content": "Halo!"
      }
    ]
  }'
```

### Claude Code Integration

ReRouter dapat digunakan langsung dengan Claude Code melalui environment variables berikut:

```bash
export ANTHROPIC_BASE_URL="https://rerouter.mubarokah.com"
export ANTHROPIC_AUTH_TOKEN="$API_KEY"
export ANTHROPIC_MODEL="claude-sonnet-5"

claude
```

Keterangan:

| Environment Variable | Value | Description |
|---|---|---|
| `ANTHROPIC_BASE_URL` | `https://rerouter.mubarokah.com` | Base URL ReRouter untuk Anthropic-compatible API. |
| `ANTHROPIC_AUTH_TOKEN` | `$API_KEY` | API key ReRouter. |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | Model yang digunakan Claude Code. |

### Count Tokens

Anthropic-compatible endpoint berikut tersedia:

```http
POST /messages/count_tokens
```

Fungsinya:

- Menghasilkan estimasi jumlah token.
- Tidak dikenakan biaya (*free*).

### Error Response Format

Error pada Anthropic endpoint menggunakan format response Anthropic:

```json
{
  "type": "error",
  "error": {
    "type": "...",
    "message": "..."
  }
}
```

---

## 4.4. Embeddings API

**API Compatibility:** OpenAI Embeddings API

| Property | Value |
|---|---|
| HTTP Method | `POST` |
| Endpoint | `/v1/embeddings` |
| Full URL | `https://rerouter.mubarokah.com/v1/embeddings` |
| API Format | OpenAI Embeddings |

### Description

Mengubah teks menjadi vector embeddings.

Embedding dapat digunakan untuk berbagai keperluan, seperti:

- Semantic search.
- Clustering.
- Retrieval-Augmented Generation (RAG).

**Important:** Hanya embedding models yang dapat digunakan pada endpoint ini. Chat models tidak dapat digunakan untuk request embedding.

### Request Parameters

| Parameter | Type | Description |
|---|---|---|
| `model` | `string` | Embedding model ID, misalnya `text-embedding-3-small` atau `gemini/gemini-embedding-001`. |
| `input` | `string` \| `array` | Satu teks atau daftar teks yang akan diubah menjadi embeddings. |
| `dimensions` | `integer` | Mengatur dimensi vector yang lebih pendek, jika didukung oleh model. |

### Supported Model Examples

```text
text-embedding-3-small
gemini/gemini-embedding-001
```

### Example Request

**cURL**

```bash
curl https://rerouter.mubarokah.com/v1/embeddings \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-3-small",
    "input": [
      "hello",
      "world"
    ]
  }'
```

### Example Response

```json
{
  "object": "list",
  "data": [
    {
      "index": 0,
      "embedding": [0.0123, …]
    },
    …
  ],
  "usage": {
    "prompt_tokens": 2,
    "total_tokens": 2,
    "cost": 0.00000004
  }
}
```

### Response Fields

| Field | Description |
|---|---|
| `object` | Tipe object response, yaitu `list`. |
| `data` | Daftar hasil embedding. |
| `data[].index` | Index input teks yang bersangkutan. |
| `data[].embedding` | Vector embedding yang dihasilkan model. |
| `usage.prompt_tokens` | Jumlah token input. |
| `usage.total_tokens` | Jumlah seluruh token. |
| `usage.cost` | Biaya penggunaan dalam USD. |

---

## 4.5. Decisions API

**API Compatibility:** OpenAI Decisions (LiteLLM)

| Property | Value |
|---|---|
| HTTP Method | `POST` |
| Endpoint | `/v1/decisions` |
| Full URL | `https://rerouter.mubarokah.com/v1/decisions` |
| API Format | OpenAI Decisions (LiteLLM) |

### Description

Decisions API digunakan untuk meminta decision model memberikan penilaian terstruktur terhadap input.

Contoh decision model:

```text
jev-1.13.0
```

Berbeda dari chat completion yang menghasilkan teks, Decisions API menghasilkan jawaban terstruktur berupa probabilitas.

Tersedia tiga jenis pertanyaan:

1. **Predicate:** menghasilkan probabilitas untuk pertanyaan ya/tidak.
2. **Choice:** memilih satu nilai dari daftar pilihan.
3. **Score:** menentukan suatu level atau tingkatan.

### Use Cases

Endpoint ini ideal untuk:

- Routing.
- Triage.
- Guardrails.
- Klasifikasi.
- Pengambilan keputusan terstruktur.

### Request Parameters

| Parameter | Type | Description |
|---|---|---|
| `model` | `string` | Decision model ID, misalnya `jev-1.13.0`. |
| `input` | `string` \| `array` | Teks yang akan dinilai atau daftar messages dengan bagian `input_text`. |
| `questions` | `array` | Daftar pertanyaan yang akan dijawab model. Mendukung 1–128 pertanyaan. |

### Question Types

#### A. Predicate

Digunakan untuk pertanyaan dengan jawaban berupa probabilitas ya/tidak.

Struktur:

```json
{
  "type": "predicate",
  "name": "is_refund",
  "instructions": "Is the customer asking for a refund?"
}
```

Field:

| Field | Type | Description |
|---|---|---|
| `type` | `string` | Harus bernilai `predicate`. |
| `name` | `string` | Nama identifier untuk hasil pertanyaan. |
| `instructions` | `string` | Instruksi atau pertanyaan yang harus dinilai model. |

#### B. Choice

Digunakan untuk memilih satu nilai dari daftar pilihan.

Struktur:

```json
{
  "type": "choice",
  "name": "urgency",
  "instructions": "How urgent?",
  "choices": [
    {
      "value": "low"
    },
    {
      "value": "high"
    }
  ]
}
```

Field:

| Field | Type | Description |
|---|---|---|
| `type` | `string` | Harus bernilai `choice`. |
| `name` | `string` | Nama identifier untuk hasil pertanyaan. |
| `instructions` | `string` | Instruksi atau pertanyaan untuk model. |
| `choices` | `array` | Daftar pilihan yang dapat dipilih model. |
| `choices[].value` | `string` | Nilai pilihan. |

#### C. Score

Digunakan untuk memberikan skor atau menentukan tingkat berdasarkan daftar level yang ditentukan.

Struktur:

```json
{
  "type": "score",
  "name": "frustration",
  "instructions": "How frustrated?",
  "levels": [
    {
      "label": "calm"
    },
    {
      "label": "annoyed"
    },
    {
      "label": "angry"
    }
  ]
}
```

Field:

| Field | Type | Description |
|---|---|---|
| `type` | `string` | Harus bernilai `score`. |
| `name` | `string` | Nama identifier untuk hasil pertanyaan. |
| `instructions` | `string` | Instruksi atau pertanyaan untuk model. |
| `levels` | `array` | Daftar level yang digunakan untuk penilaian. |
| `levels[].label` | `string` | Label untuk masing-masing level. |

### Important Constraints

- Jumlah pertanyaan minimum: `1`.
- Jumlah pertanyaan maksimum: `128`.
- Jawaban dikembalikan dalam urutan yang sama dengan pertanyaan yang dikirimkan.
- Endpoint ini tidak mendukung streaming.
- Jika model menolak menjawab suatu pertanyaan, hasilnya dikembalikan sebagai:

```json
{
  "type": "refusal"
}
```

### Example Request

**cURL**

```bash
curl https://rerouter.mubarokah.com/v1/decisions \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "jev-1.13.0",
    "input": "Customer: I was charged twice for order #4411, please refund one today.",
    "questions": [
      {
        "type": "predicate",
        "name": "is_refund",
        "instructions": "Is the customer asking for a refund?"
      },
      {
        "type": "choice",
        "name": "urgency",
        "instructions": "How urgent?",
        "choices": [
          {
            "value": "low"
          },
          {
            "value": "high"
          }
        ]
      },
      {
        "type": "score",
        "name": "frustration",
        "instructions": "How frustrated?",
        "levels": [
          {
            "label": "calm"
          },
          {
            "label": "annoyed"
          },
          {
            "label": "angry"
          }
        ]
      }
    ]
  }'
```

### Example Response

```json
{
  "model": "jev-1.13.0",
  "answers": [
    {
      "type": "predicate",
      "name": "is_refund",
      "probability": 0.99
    },
    {
      "type": "choice",
      "name": "urgency",
      "choice": "high",
      "probabilities": [
        {
          "value": "low",
          "probability": 0.07
        },
        {
          "value": "high",
          "probability": 0.93
        }
      ],
      "confidence": 0.86
    },
    {
      "type": "score",
      "name": "frustration",
      "score": 0.5,
      "probabilities": [
        …
      ],
      "confidence": 0.25
    }
  ],
  "usage": {
    "input_tokens": 358,
    "output_tokens": 66,
    "cost": 0.00002
  }
}
```

### Response Fields

| Field | Description |
|---|---|
| `model` | Decision model yang digunakan. |
| `answers` | Daftar jawaban dari model. |
| `answers[].type` | Jenis pertanyaan: `predicate`, `choice`, atau `score`. |
| `answers[].name` | Nama identifier pertanyaan. |
| `answers[].probability` | Probabilitas jawaban untuk tipe `predicate`. |
| `answers[].choice` | Nilai pilihan yang dipilih untuk tipe `choice`. |
| `answers[].probabilities` | Daftar probabilitas untuk pilihan atau level. |
| `answers[].probabilities[].value` | Nilai pilihan. |
| `answers[].probabilities[].probability` | Probabilitas dari nilai pilihan. |
| `answers[].score` | Skor hasil penilaian untuk tipe `score`. |
| `answers[].confidence` | Tingkat confidence hasil jawaban. |
| `usage.input_tokens` | Jumlah token input. |
| `usage.output_tokens` | Jumlah token output. |
| `usage.cost` | Biaya penggunaan dalam USD. |

---

## 4.6. System One API

**API Compatibility:** TypeSafe System One (LiteLLM)

| Property | Value |
|---|---|
| HTTP Method | `POST` |
| Endpoint | `/v1/systemone` |
| Full URL | `https://rerouter.mubarokah.com/v1/systemone` |
| API Format | TypeSafe System One (LiteLLM) |

### Description

System One API menyediakan akses ke decision models yang sama dengan Decisions API, tetapi menggunakan format request dan response milik TypeSafe System One.

Format ini menggunakan:

- `state` sebagai input.
- Named questions sebagai daftar pertanyaan.
- Tipe pertanyaan `noul`, `choice`, dan `score`.

### Request Structure

| Field | Type | Description |
|---|---|---|
| `model` | `string` | Model ID dengan format TypeSafe, misalnya `typesafe/jev-1.14.0`. |
| `state` | `string` | State atau input yang akan dievaluasi. |
| `questions` | `object` | Kumpulan pertanyaan bernama, masing-masing dengan tipe dan instruksi. |

### Question Types

System One mendukung tiga jenis pertanyaan:

| Type | Description |
|---|---|
| `noul` | Pertanyaan dengan hasil penilaian ya/tidak dalam format probabilitas. |
| `choice` | Memilih nilai dari sekumpulan pilihan. |
| `score` | Menentukan skor berdasarkan level yang tersedia. |

### Example Request

**cURL**

```bash
curl https://rerouter.mubarokah.com/v1/systemone \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "typesafe/jev-1.14.0",
    "state": "I was charged twice, refund please",
    "questions": {
      "is_refund": {
        "type": "noul",
        "instructions": "Is this a refund request?"
      }
    }
  }'
```

### Example Response

```json
{
  "model": "typesafe/jev-1.14.0",
  "answers": {
    "is_refund": {
      "type": "noul",
      "noul": 0.98
    }
  },
  "usage": {
    "input_tokens": 279,
    "output_tokens": 22,
    "cost": 0.000012
  }
}
```

### Response Fields

| Field | Description |
|---|---|
| `model` | System One model yang digunakan. |
| `answers` | Object berisi jawaban berdasarkan nama pertanyaan. |
| `answers.<question_name>.type` | Jenis pertanyaan. |
| `answers.<question_name>.noul` | Nilai probabilitas untuk tipe `noul`. |
| `usage.input_tokens` | Jumlah token input. |
| `usage.output_tokens` | Jumlah token output. |
| `usage.cost` | Biaya penggunaan dalam USD. |

---

## 4.7. Models API

**API Compatibility:** OpenAI Models API

| Property | Value |
|---|---|
| HTTP Method | `GET` |
| Endpoint | `/v1/models` |
| Full URL | `https://rerouter.mubarokah.com/v1/models` |
| API Format | OpenAI Models |

### Description

Mengambil daftar seluruh model yang tersedia dan dapat dipanggil melalui ReRouter.

Informasi yang disediakan mencakup:

- Model ID.
- Harga per token.
- Jenis mode model.
- Dukungan vision.
- Dukungan thinking.

### Model Capabilities

Setiap model dapat memiliki informasi berikut:

| Property | Description |
|---|---|
| `mode` | Jenis model: `chat`, `embedding`, atau `decision`. |
| `vision` | Menunjukkan apakah model mendukung pemrosesan gambar. |
| `thinking` | Menunjukkan apakah model mendukung fitur thinking/reasoning. |
| Pricing | Informasi harga per token. |

### Model Modes

| Mode | Description |
|---|---|
| `chat` | Model untuk percakapan dan generasi teks. |
| `embedding` | Model untuk menghasilkan vector embeddings. |
| `decision` | Model untuk menghasilkan keputusan terstruktur. |

### Anthropic-Compatible Model List

Secara default, endpoint ini mengembalikan daftar model dengan format OpenAI Models API.

Untuk mendapatkan format daftar model yang kompatibel dengan Anthropic, sertakan header:

```http
anthropic-version: 2023-06-01
```

### Example Request

**cURL**

```bash
curl https://rerouter.mubarokah.com/v1/models \
  -H "Authorization: Bearer $API_KEY"
```

---

# 5. Endpoint Reference Summary

Daftar seluruh endpoint yang tersedia:

| HTTP Method | Endpoint | API Compatibility | Purpose |
|---|---|---|---|
| `POST` | `/v1/chat/completions` | OpenAI Chat Completions | Menghasilkan balasan dari daftar messages. |
| `POST` | `/v1/responses` | OpenAI Responses | Menghasilkan response menggunakan format Responses API. |
| `POST` | `/v1/messages` | Anthropic Messages | Menghasilkan response menggunakan format Anthropic Messages. |
| `POST` | `/v1/messages/count_tokens` | Anthropic | Mengestimasi jumlah token. Gratis. |
| `POST` | `/v1/embeddings` | OpenAI Embeddings | Mengubah teks menjadi vector embeddings. |
| `POST` | `/v1/decisions` | OpenAI Decisions (LiteLLM) | Menghasilkan keputusan terstruktur berupa predicate, choice, atau score. |
| `POST` | `/v1/systemone` | TypeSafe System One (LiteLLM) | Menghasilkan keputusan menggunakan format TypeSafe System One. |
| `GET` | `/v1/models` | OpenAI Models | Mengambil daftar model dan informasi kemampuan serta harganya. |

---

# 6. Important Rules and Implementation Notes

Bagian ini merangkum ketentuan implementasi yang harus diperhatikan ketika mengintegrasikan ReRouter.

## 6.1. API Key and Authentication

- Gunakan satu API key untuk mengakses semua model yang diizinkan.
- API key dibuat melalui halaman **API Keys**.
- Setiap request harus menyertakan API key.
- Gunakan salah satu dari header `Authorization: Bearer` atau `x-api-key`.
- API key dapat dibatasi menggunakan credit limit dan model allow-list.

## 6.2. Model Selection

- Gunakan `GET /v1/models` untuk mengetahui model yang tersedia.
- Perhatikan mode model sebelum menentukan endpoint.
- Model dengan mode `chat` digunakan untuk endpoint percakapan.
- Model dengan mode `embedding` digunakan pada `/v1/embeddings`.
- Model dengan mode `decision` digunakan pada `/v1/decisions` atau `/v1/systemone`.
- Model yang tidak dikenal menghasilkan HTTP `404`.
- Model yang tidak diizinkan oleh API key menghasilkan HTTP `403`.
- Penggunaan model pada endpoint yang salah dapat menghasilkan HTTP `400`.

## 6.3. Cost and Usage

- Setiap response menyertakan informasi penggunaan.
- Biaya penggunaan dilaporkan dalam USD melalui `usage.cost`.
- Jika kredit tidak mencukupi, request ditolak dengan HTTP `402`.
- Output dapat dibatasi secara otomatis berdasarkan sisa kredit.
- Credit limit API key juga harus diperhatikan.

## 6.4. Streaming

Streaming didukung pada:

- `/v1/chat/completions`
- `/v1/responses`
- `/v1/messages`

Ketentuan khusus:

- Chat Completions mengirimkan informasi usage, termasuk cost, pada chunk terakhir.
- Responses API mengakhiri streaming dengan event `response.completed`.
- Responses API yang menggunakan fallback ke Chat Completions tetap mendukung streaming.
- `/v1/decisions` tidak mendukung streaming.
- Dokumentasi endpoint `/v1/systemone` tidak menyatakan dukungan streaming.

## 6.5. Tools and Function Calling

Dukungan tools tersedia pada:

- `/v1/chat/completions`
- `/v1/responses`
- `/v1/messages`

Ketentuan berdasarkan format:

- Chat Completions menggunakan `tools`, `tool_choice`, dan `parallel_tool_calls`.
- Responses API mendukung tools.
- Anthropic Messages menggunakan `tools` dan `tool_choice`, dengan `input_schema` untuk client tools.

## 6.6. Vision and Images

- Chat Completions mendukung images melalui `image_url` pada user content jika menggunakan vision model.
- Responses API mendukung `input_image`.
- Anthropic Messages mendukung image blocks.
- Dukungan vision bergantung pada model yang digunakan.

## 6.7. Reasoning and Thinking

- Chat Completions menggunakan `reasoning_effort` dengan nilai `low`, `medium`, atau `high`.
- Responses API menggunakan object `reasoning`, misalnya `{"effort": "low"}`.
- Anthropic Messages menggunakan object `thinking`, misalnya `{"type": "enabled", "budget_tokens": N}`.
- Fitur reasoning/thinking hanya tersedia pada model yang mendukungnya.

## 6.8. Anthropic Compatibility

- `/v1/messages` kompatibel dengan Anthropic SDK dan Claude Code.
- Semua chat model dapat dipanggil melalui endpoint Anthropic Messages, tidak hanya Claude.
- Nama Claude yang menggunakan suffix tanggal dapat dipetakan ke nama model katalog.
- Header `anthropic-version` digunakan untuk kompatibilitas format Anthropic.
- Endpoint `/messages/count_tokens` memberikan estimasi token secara gratis.
- Error response menggunakan struktur error Anthropic.

## 6.9. Stateless Responses API

- Responses API tidak mendukung `previous_response_id`.
- Client bertanggung jawab mengirimkan seluruh riwayat percakapan dalam setiap request berikutnya.
- Jangan mengasumsikan server menyimpan konteks percakapan antar-request.

## 6.10. Request Size and Rate Limits

- Ukuran request body maksimum adalah 32 MB.
- Request yang melebihi ukuran tersebut menghasilkan HTTP `413`.
- Rate limit berlaku per API key.
- Rate limit juga berlaku untuk akun secara keseluruhan, mencakup semua API key.
- Rate limit terlampaui menghasilkan HTTP `429`.

---

# 7. Quick Integration Reference

## Base URL

```text
https://rerouter.mubarokah.com/v1
```

## Authentication

```http
Authorization: Bearer sk-...
```

Atau:

```http
x-api-key: sk-...
```

## Content-Type

Untuk request JSON:

```http
Content-Type: application/json
```

## Endpoint Selection Guide

| Kebutuhan | Endpoint |
|---|---|
| Chat completion | `POST /v1/chat/completions` |
| OpenAI Responses API | `POST /v1/responses` |
| Anthropic Messages API | `POST /v1/messages` |
| Estimasi token Anthropic | `POST /v1/messages/count_tokens` |
| Generate embeddings | `POST /v1/embeddings` |
| Decision: predicate, choice, score | `POST /v1/decisions` |
| TypeSafe System One decisions | `POST /v1/systemone` |
| Daftar model dan harga | `GET /v1/models` |

## Compatibility Guide

| Client / SDK | Endpoint | Compatibility |
|---|---|---|
| OpenAI SDK | `/v1/chat/completions` | OpenAI Chat Completions |
| OpenAI SDK | `/v1/responses` | OpenAI Responses |
| OpenAI SDK | `/v1/embeddings` | OpenAI Embeddings |
| OpenAI SDK | `/v1/models` | OpenAI Models |
| Anthropic SDK | `/v1/messages` | Anthropic Messages |
| Claude Code | `/v1/messages` | Anthropic-compatible |
| LiteLLM Decisions | `/v1/decisions` | OpenAI Decisions |
| TypeSafe System One | `/v1/systemone` | TypeSafe System One |

---

# 8. Final Integration Checklist

Gunakan checklist berikut ketika mengimplementasikan ReRouter ke dalam aplikasi atau AI Agent.

- [ ] Buat API key melalui halaman API Keys.
- [ ] Simpan API key secara aman menggunakan environment variable.
- [ ] Konfigurasikan base URL menjadi `https://rerouter.mubarokah.com/v1` untuk integrasi OpenAI-compatible.
- [ ] Gunakan authentication header yang sesuai.
- [ ] Ambil daftar model melalui `GET /v1/models`.
- [ ] Periksa mode model sebelum memanggil endpoint.
- [ ] Pastikan API key memiliki izin menggunakan model yang dipilih.
- [ ] Sesuaikan parameter request dengan endpoint yang digunakan.
- [ ] Periksa dukungan model untuk vision, thinking, tools, dan streaming.
- [ ] Tangani seluruh HTTP error status, khususnya `400`, `401`, `402`, `403`, `404`, `413`, `429`, dan `502`.
- [ ] Baca informasi usage pada response.
- [ ] Pantau `usage.cost` untuk mengontrol biaya penggunaan.
- [ ] Perhatikan credit limit dan sisa kredit API key.
- [ ] Untuk Responses API, kirim seluruh riwayat percakapan pada setiap request karena `previous_response_id` tidak didukung.
- [ ] Untuk Anthropic SDK dan Claude Code, gunakan konfigurasi Anthropic-compatible yang sesuai.

---

**End of ReRouter API Documentation**

**Base URL:** `https://rerouter.mubarokah.com/v1`

**Compatibility:** OpenAI API · Anthropic API · LiteLLM Decisions · TypeSafe System One