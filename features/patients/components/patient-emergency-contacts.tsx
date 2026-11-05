"use client";

import { useId, useRef, useState } from "react";
import { Plus, ShieldCheck, Trash2, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/providers/i18n-provider";
import { composeE164, splitE164 } from "@/lib/phone";
import type { CountryOption, EmergencyContact } from "../types";

export type ContactDraft = { name: string; relationship: string; phone: string; email: string };
export const emptyContact = (): ContactDraft => ({ name: "", relationship: "", phone: "", email: "" });
export const contactDraft = (contact?: EmergencyContact | null): ContactDraft => ({ name: contact?.name ?? "", relationship: contact?.relationship ?? "", phone: contact?.phone ?? "", email: contact?.email ?? "" });
export const hasContact = (contact: ContactDraft) => Object.values(contact).some(value => value.trim());

export function PatientEmergencyContacts({ primary, secondary, onPrimaryChange, onSecondaryChange, countries, disabled, errors }: {
  primary: ContactDraft; secondary: ContactDraft; onPrimaryChange: (value: ContactDraft) => void;
  onSecondaryChange: (value: ContactDraft) => void; countries: CountryOption[]; disabled: boolean; errors: string[];
}) {
  const t = useT();
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const secondaryName = useRef<HTMLInputElement>(null);
  const visible = expanded || hasContact(secondary);
  return <section aria-label={t("Contactos de emergencia")} className="grid min-w-0 gap-4 sm:col-span-2 lg:col-span-3">
    <p className="flex gap-2 text-sm leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{t("SOS avisa por llamada y SMS a los contactos registrados. El correo es opcional.")}</p>
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      {([false, true] as const).map(optional => {
        if (optional && !visible) return null;
        const value = optional ? secondary : primary;
        const title = optional ? "Contacto opcional" : "Contacto principal";
        const change = (next: ContactDraft) => optional ? (setExpanded(true), onSecondaryChange(next)) : onPrimaryChange(next);
        return <div key={title} id={optional ? `${id}-secondary` : undefined} className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <header className="mb-5 flex items-start gap-3">
            <span className="rounded-xl bg-primary/10 p-2.5 text-primary">{optional ? <Users className="size-5" aria-hidden="true" /> : <UserRound className="size-5" aria-hidden="true" />}</span>
            <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{t(title)}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(optional ? "Otra persona que puede ayudarte" : "Necesario para activar el programa")}</p></div>
            <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-semibold">{t(optional ? "Opcional" : "Principal")}</span>
          </header>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor={`${id}-${optional}-name`}>{t(optional ? "Nombre del contacto opcional" : "Nombre del contacto principal")}</Label><Input ref={optional ? secondaryName : undefined} id={`${id}-${optional}-name`} value={value.name} maxLength={200} disabled={disabled} autoComplete="off" onChange={e => change({ ...value, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor={`${id}-${optional}-relationship`}>{t("Parentesco (opcional)")}</Label><Input id={`${id}-${optional}-relationship`} value={value.relationship} maxLength={100} disabled={disabled} onChange={e => change({ ...value, relationship: e.target.value })} /></div>
            <ContactPhone id={`${id}-${optional}-phone`} value={value.phone} onChange={phone => change({ ...value, phone })} countries={countries} disabled={disabled} optional={optional} />
            <div className="grid content-start gap-2"><Label htmlFor={`${id}-${optional}-email`}>{t("Correo (opcional)")}</Label><Input id={`${id}-${optional}-email`} type="email" value={value.email} maxLength={320} disabled={disabled} onChange={e => change({ ...value, email: e.target.value })} /></div>
          </div>
          {optional && <Button type="button" variant="ghost" size="sm" className="mt-4 text-muted-foreground" disabled={disabled} onClick={() => { onSecondaryChange(emptyContact()); setExpanded(false); requestAnimationFrame(() => addButton.current?.focus()); }}><Trash2 className="size-4" />{t("Quitar contacto opcional")}</Button>}
        </div>;
      })}
    </div>
    {!visible && <Button ref={addButton} type="button" variant="outline" className="min-h-12 w-full border-dashed text-primary" disabled={disabled} aria-expanded={false} aria-controls={`${id}-secondary`} onClick={() => { setExpanded(true); requestAnimationFrame(() => secondaryName.current?.focus()); }}><Plus className="size-4" />{t("Añadir contacto opcional")}</Button>}
    {errors.length > 0 && <div role="alert" className="text-sm text-destructive">{errors.map(error => <p key={error}>{error}</p>)}</div>}
  </section>;
}

function ContactPhone({ id, value, onChange, countries, disabled, optional }: { id: string; value: string; onChange: (phone: string) => void; countries: CountryOption[]; disabled: boolean; optional: boolean }) {
  const t = useT();
  const [emptyCode, setEmptyCode] = useState("57");
  const options = [...new Map([{ phoneCode: "57", name: t("Colombia") }, { phoneCode: "1", name: t("Estados Unidos") }, ...countries.filter(c => c.phoneCode !== "57" && c.phoneCode !== "1")].filter(c => c.phoneCode).map(c => [c.phoneCode, c])).values()];
  const split = splitE164(value, options, "57");
  const code = value ? split.phoneCode : emptyCode;
  return <div className="grid min-w-0 content-start gap-2"><Label htmlFor={id}>{t("Teléfono")}</Label><div className="flex min-w-0 gap-2">
    <Select items={Object.fromEntries(options.map(c => [c.phoneCode, `+${c.phoneCode}`]))} value={code} disabled={disabled} onValueChange={code => { if (!code) return; setEmptyCode(code); onChange(composeE164(code, split.national)); }}>
      <SelectTrigger aria-label={t(optional ? "País del contacto opcional" : "País del contacto principal")} className="h-9! w-22 shrink-0"><SelectValue /></SelectTrigger><SelectContent>{options.map(c => <SelectItem key={c.phoneCode} value={c.phoneCode}>+{c.phoneCode} · {c.name}</SelectItem>)}</SelectContent>
    </Select><Input id={id} type="tel" className="min-w-0 flex-1" value={split.national} maxLength={20} disabled={disabled} onChange={e => onChange(!e.target.value.trim() ? "" : e.target.value.trim().startsWith("+") ? e.target.value : `+${code}${e.target.value}`)} />
  </div><p className="text-xs leading-relaxed text-muted-foreground">{t("Sin repetir el código de país.")}</p></div>;
}
