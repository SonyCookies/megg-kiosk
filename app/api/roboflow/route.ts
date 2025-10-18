// app/api/roboflow/route.ts
import { NextResponse } from 'next/server'
import { ROBOFLOW_CONFIG } from '../../config/roboflow'

export async function POST(request: Request) {
  try {
    const { imageBase64, imageUrl } = await request.json()

    if (!process.env.ROBOFLOW_API_KEY) {
      return NextResponse.json({ error: 'ROBOFLOW_API_KEY is not set on the server' }, { status: 500 })
    }

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json({ error: 'Missing image payload: provide imageBase64 or imageUrl' }, { status: 400 })
    }

    const endpoint = `${ROBOFLOW_CONFIG.API_URL}/${ROBOFLOW_CONFIG.WORKSPACE_NAME}/workflows/${ROBOFLOW_CONFIG.WORKFLOW_ID}`

    const payload: any = {
      api_key: process.env.ROBOFLOW_API_KEY,
      inputs: {
        image: imageBase64
          ? { type: 'base64', value: imageBase64 }
          : { type: 'url', value: imageUrl }
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      // Timebox to avoid hanging requests
      signal: AbortSignal.timeout(ROBOFLOW_CONFIG.TIMEOUT)
    })

    const text = await response.text()

    if (!response.ok) {
      return NextResponse.json({ error: 'Roboflow API error', status: response.status, details: text }, { status: 502 })
    }

    try {
      const json = JSON.parse(text)
      return NextResponse.json(json)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON from Roboflow', raw: text }, { status: 502 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}
