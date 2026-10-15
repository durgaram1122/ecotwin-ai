import { NextResponse } from 'next/server';

export function ok<T>(data: T, init?: ResponseInit) { return NextResponse.json(data, init); }
export function fail(message: string, status = 400, code?: string) { return NextResponse.json({ error: message, code }, { status }); }
export function nowId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
