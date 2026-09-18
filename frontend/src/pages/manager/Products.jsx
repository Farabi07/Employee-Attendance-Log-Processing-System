import React, { useEffect, useState } from "react";
import { ImagePlus, Pencil, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { T, fontBody, fontDisplay, fontMono } from "../../theme";
import { api, mediaUrl } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import Card from "../../components/Card";

const blank = { name: "", category: "", description: "", price: "", offer_price: "", offer_active: false, is_available: true, sku: "" };

export default function ManagerProducts() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const [form, setForm] = useState(blank);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = async () => { const result = await api.get(endpoints.productsAll()); setProducts(result?.products || []); };
  useEffect(() => { load().catch((e) => window.alert(e.message)).finally(() => setLoading(false)); }, []);
  const open = (product = null) => { setEditing(product); setImage(null); setForm(product ? { ...blank, ...product } : blank); };
  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.category.trim() || Number(form.price) <= 0) return window.alert("Name, category and a valid price are required.");
    setSaving(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, String(value ?? "")));
      if (image) body.append("image", image);
      if (editing) await api.patch(endpoints.productDetail(editing.id), body); else await api.post(endpoints.productsAll(), body);
      setEditing(undefined); await load();
    } catch (error) { window.alert(error.message || "Could not save product"); } finally { setSaving(false); }
  };
  const remove = async (product) => { if (!window.confirm(`Delete ${product.name}?`)) return; try { await api.del(endpoints.productDetail(product.id)); await load(); } catch (e) { window.alert(e.message); } };
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const input = (key, label, type = "text") => <label style={styles.field}><span>{label}</span><input type={type} value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} /></label>;
  return <div style={{ maxWidth: 1000 }}>
    <div style={styles.heading}><div><p style={styles.eyebrow}>Catalog</p><h2 style={styles.title}>Products</h2><p style={styles.subtitle}>Manage menu items, offers and store products for your cafe, restaurant or supershop.</p></div><button style={styles.primary} onClick={() => open()}><Plus size={16} /> Add product</button></div>
    {loading ? <p style={styles.muted}>Loading products…</p> : products.length === 0 ? <Card><div style={styles.empty}><ShoppingBag size={30} color={T.faint} /><p style={styles.muted}>No products yet. Add your first product.</p><button style={styles.linkButton} onClick={() => open()}>Add product</button></div></Card> : <div style={styles.grid}>{products.map((product) => <Card key={product.id} style={{ padding: 0, overflow: "hidden" }}><div style={styles.card}><div style={styles.productImage}>{product.image ? <img src={mediaUrl(product.image)} alt="" style={styles.image} /> : <ShoppingBag size={28} color={T.faint} />}</div><div style={styles.productBody}><div style={styles.row}><strong style={styles.name}>{product.name}</strong><span style={styles.category}>{product.category}</span></div>{product.description && <p style={styles.description}>{product.description}</p>}<div style={styles.price}><span>৳{product.price}</span>{product.offer_price && product.offer_active && <b>Offer ৳{product.offer_price}</b>}</div><small style={{ color: product.is_available ? T.tealDeep : T.coral }}>{product.is_available ? (product.offer_active ? "Offer active" : "Available") : "Unavailable"}</small><div style={styles.actions}><button style={styles.iconButton} onClick={() => open(product)}><Pencil size={15} /></button><button style={styles.iconButton} onClick={() => remove(product)}><Trash2 size={15} color={T.coral} /></button></div></div></div></Card>)}</div>}
    {editing !== undefined && <div style={styles.overlay}><Card style={styles.modal}><div style={styles.modalHead}><h3 style={styles.modalTitle}>{editing ? "Edit product" : "Add product"}</h3><button style={styles.close} onClick={() => setEditing(undefined)}><X size={18} /></button></div><form onSubmit={save}>{input("name", "Product name")}{input("category", "Category")}{input("description", "Description")}<div style={styles.two}>{input("price", "Regular price", "number")}{input("offer_price", "Offer price", "number")}</div>{input("sku", "SKU (optional)")}<label style={styles.upload}><ImagePlus size={18} /> Product image<input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} /></label><label style={styles.check}><input type="checkbox" checked={form.offer_active} onChange={(e) => set("offer_active", e.target.checked)} /> Show offer price</label><label style={styles.check}><input type="checkbox" checked={form.is_available} onChange={(e) => set("is_available", e.target.checked)} /> Available for sale</label><button style={styles.primary} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add product"}</button></form></Card></div>}
  </div>;
}
const styles = {
  heading: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }, eyebrow: { fontFamily: fontBody, fontSize: 11, fontWeight: 600, color: T.tealDeep, textTransform: "uppercase", letterSpacing: .7, margin: 0 }, title: { fontFamily: fontDisplay, fontSize: 26, color: T.ink, margin: "4px 0" }, subtitle: { fontFamily: fontBody, color: T.muted, fontSize: 13, margin: 0 }, primary: { display: "inline-flex", alignItems: "center", gap: 7, border: 0, borderRadius: 9, padding: "10px 14px", background: T.teal, color: T.onAccent, fontFamily: fontBody, fontWeight: 600, cursor: "pointer" }, muted: { fontFamily: fontBody, color: T.muted, fontSize: 13 }, grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }, card: { display: "flex", minHeight: 150 }, productImage: { width: 105, background: T.line2, display: "grid", placeItems: "center", flexShrink: 0 }, image: { width: "100%", height: "100%", objectFit: "cover" }, productBody: { padding: 14, flex: 1, minWidth: 0 }, row: { display: "flex", justifyContent: "space-between", gap: 8 }, name: { fontFamily: fontBody, color: T.ink, fontSize: 14 }, category: { color: T.tealDeep, fontSize: 11 }, description: { color: T.muted, fontSize: 12, margin: "7px 0" }, price: { display: "flex", gap: 10, fontFamily: fontMono, fontSize: 13, margin: "8px 0" }, actions: { display: "flex", gap: 7, marginTop: 10 }, iconButton: { border: 0, borderRadius: 7, padding: 7, background: T.line2, cursor: "pointer" }, empty: { textAlign: "center", padding: 42 }, linkButton: { border: 0, background: "transparent", color: T.tealDeep, cursor: "pointer", fontWeight: 600 }, overlay: { position: "fixed", inset: 0, background: T.overlay, display: "grid", placeItems: "center", padding: 16, zIndex: 50 }, modal: { width: "min(560px, 96vw)", maxHeight: "90vh", overflowY: "auto" }, modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, modalTitle: { fontFamily: fontDisplay, color: T.ink, margin: 0 }, close: { border: 0, background: "transparent", cursor: "pointer" }, field: { display: "block", marginBottom: 12, fontFamily: fontBody, fontSize: 12, color: T.muted }, fieldInput: {}, two: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }, upload: { display: "flex", alignItems: "center", gap: 8, border: `1px dashed ${T.line}`, padding: 12, borderRadius: 8, color: T.tealDeep, fontSize: 12, marginBottom: 12 }, check: { display: "block", fontFamily: fontBody, fontSize: 12, color: T.ink, margin: "10px 0" },
};
