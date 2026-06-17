# Cymek — Product Definition

## Do NOT confuse this with document Q&A. Cymek replaces an AI agency.

## The Problem

A business owner or early-stage startup knows they need AI in their product or workflow.
They want, for example:
- "I want a support bot trained on my FAQ and pricing PDFs"
- "I want an AI that routes customer emails to the right department based on my SOPs"
- "I want an AI onboarding assistant that answers questions from my employee handbook"

The options today:
- **Hire an AI agency**: $10k–$50k per project, takes weeks. Most businesses cannot afford this or do not have the network to find competent help.
- **Build it themselves**: Requires understanding RAG, chunking strategies, embedding models, vector databases, prompt engineering, evaluation metrics. Not viable for non-technical founders.
- **Generic ChatGPT**: Cannot be trained on your specific documents or configured for your specific use case.

## The Solution

Cymek is a **one-click AI pipeline builder** that removes the human engineer entirely.

A business owner:
1. Pastes their LLM API key (OpenAI / OpenRouter)
2. Describes their use case in plain English ("I want a support bot for my SaaS")
3. Uploads their data (PDFs, URLs, text)
4. Clicks deploy

Cymek automatically:
- Ingests and chunks the data
- Generates a custom system prompt that captures the business use case, tone, and domain
- Embeds everything into a vector database
- Evaluates quality by generating Q&A pairs and scoring faithfulness + relevance
- Retries with different parameters if quality is below threshold
- Deploys a production-ready chat endpoint + embeddable JS widget

The output is NOT an answer to a document question. The output is a **production-ready AI feature** the business can ship to their own customers.

## Target User

- Non-technical business owners
- Early-stage startup founders without AI engineers
- Anyone who would otherwise hire an AI agency for $10k–$50k

## Key Differentiator

Full end-to-end automation of what an AI agency does manually — data prep, chunking strategy, embedding, prompt engineering, quality evaluation, retry tuning, deployment — all in under 20 minutes at the cost of the user's own LLM API usage.
