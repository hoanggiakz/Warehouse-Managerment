"use client"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => { console.error(error) }, [error]); return <section className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-3xl font-semibold">Something went wrong</h1><p className="mt-3 text-muted-foreground">Please try loading the page again.</p><Button className="mt-6" onClick={reset}>Try again</Button></div></section> }
