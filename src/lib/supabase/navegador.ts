"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON, SUPABASE_URL } from "./config";

/* Cliente do navegador — usa a chave anon e o login do Supabase Auth.
   Serve para o painel ler; escrita continua sendo só do servidor. */
export const supabaseNavegador = () => createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
