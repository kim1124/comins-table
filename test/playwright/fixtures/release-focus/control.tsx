import { useState } from "react";
import { start } from "./app";
function Feature() { const [query,setQuery]=useState(""); return <section><input aria-label="Control search" value={query} onChange={e=>setQuery(e.currentTarget.value)}/></section>; }
start(Feature);
