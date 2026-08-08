"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API=(process.env.NEXT_PUBLIC_API_URL??"http://localhost:5000").replace(/\/$/,"");

const token=()=>typeof window==="undefined"?"":(
localStorage.getItem("accessToken")||
localStorage.getItem("token")||
localStorage.getItem("authToken")||
localStorage.getItem("jwt")||"");

export default function EditTenantPage(){
const {tenantId}=useParams();
const router=useRouter();

const [loading,setLoading]=useState(true);
const [saving,setSaving]=useState(false);
const [error,setError]=useState("");

const [form,setForm]=useState({
businessName:"",
storeName:"",
ownerName:"",
ownerEmail:"",
ownerPhone:"",
status:"active"
});

useEffect(()=>{
(async()=>{
try{
const r=await fetch(`${API}/api/tenants/${tenantId}`,{
headers:{
Accept:"application/json",
Authorization:`Bearer ${token()}`
},
credentials:"include"
});
const d=await r.json();
const t=d.tenant||d.data||d;
setForm({
businessName:t.businessName||"",
storeName:t.storeName||"",
ownerName:t.ownerName||"",
ownerEmail:t.ownerEmail||"",
ownerPhone:t.ownerPhone||"",
status:t.status||"active"
});
}catch(e){
setError("Failed to load tenant.");
}finally{
setLoading(false);
}
})();
},[tenantId]);

const change=(e:any)=>{
setForm({...form,[e.target.name]:e.target.value});
};

const submit=async(e:any)=>{
e.preventDefault();
setSaving(true);
setError("");
try{
const r=await fetch(`${API}/api/tenants/${tenantId}`,{
method:"PATCH",
headers:{
"Content-Type":"application/json",
Accept:"application/json",
Authorization:`Bearer ${token()}`
},
credentials:"include",
body:JSON.stringify(form)
});
const d=await r.json().catch(()=>null);
if(!r.ok) throw new Error(d?.message||"Update failed");
router.push(`/admin/tenants/${tenantId}`);
router.refresh();
}catch(err:any){
setError(err.message||"Update failed");
}finally{
setSaving(false);
}
};

if(loading){
return <div className="p-8">Loading...</div>;
}

return(
<main className="max-w-3xl mx-auto p-8">
<h1 className="text-3xl font-bold mb-6">Edit Tenant</h1>

<form onSubmit={submit} className="space-y-5 bg-white border rounded-2xl p-6">

{error&&(
<div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">
{error}
</div>
)}

{[
["businessName","Business Name"],
["storeName","Store Name"],
["ownerName","Owner Name"],
["ownerEmail","Owner Email"],
["ownerPhone","Owner Phone"]
].map(([name,label])=>(
<div key={name}>
<label className="block text-sm font-semibold mb-2">{label}</label>
<input
name={name}
required
type={name==="ownerEmail"?"email":"text"}
value={(form as any)[name]}
onChange={change}
className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-300"
/>
</div>
))}

<div>
<label className="block text-sm font-semibold mb-2">Status</label>
<select
name="status"
value={form.status}
onChange={change}
className="w-full border rounded-xl px-4 py-3">
<option value="active">Active</option>
<option value="inactive">Inactive</option>
<option value="suspended">Suspended</option>
</select>
</div>

<div className="flex gap-3">
<button
disabled={saving}
className="bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-700 disabled:opacity-60">
{saving?"Saving...":"Save Changes"}
</button>

<button
type="button"
onClick={()=>router.back()}
className="border px-6 py-3 rounded-xl font-semibold">
Cancel
</button>
</div>

</form>
</main>
);
}
