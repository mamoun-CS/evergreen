'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
/** Shared progressive validation for existing server-action and client forms. */
export default function AdminFormValidation() {
 const path=usePathname();
 useEffect(()=>{
  const check=(field:HTMLInputElement|HTMLTextAreaElement,show=false)=>{
   if(['checkbox','radio','hidden','submit','password'].includes(field.type))return;
   const key=field.name.split('_').pop() || '';let error='';
   const max=/^(name|title|label)/i.test(key)?200:/slug/i.test(key)?100:/sku/i.test(key)?50:/content/i.test(key)?50000:2000;
   if(field.value.length>max)error=`Maximum ${max} characters`;
   if(/[<>]/.test(field.value))error='HTML is not allowed';
   if(field.value && key==='slug' && !/^[a-z0-9-]+$/.test(field.value))error='Use lowercase letters, numbers and hyphens';
   if(field.type==='number' && field.value && (!Number.isFinite(Number(field.value)) || Number(field.value)<0 || Number(field.value)>999999))error='Enter a number from 0 to 999999';
   if(/stock|quantity|maximumUses/i.test(key)&&field.value&&!Number.isInteger(Number(field.value)))error='Enter a whole number';
   if(key==='discountPrice'&&field.value){const base=field.form?.querySelector<HTMLInputElement>('[name="basePrice"]');if(base && Number(field.value)>Number(base.value))error='Discount cannot exceed base price';}
   field.setCustomValidity(error);
   if(show){
    if(!field.id)field.id=`admin-field-${Math.random().toString(36).slice(2)}`;
    const errorId=`${field.id}-error`;let node=document.getElementById(errorId);
    if(!node){node=document.createElement('p');node.id=errorId;node.className='text-sm text-red-700 mt-1';field.insertAdjacentElement('afterend',node);}
    node.textContent=error || (field.validity.valueMissing?'Required':field.validity.typeMismatch?'Invalid format':'');field.setAttribute('aria-describedby',errorId);field.setAttribute('aria-invalid',String(!field.validity.valid));
   }
  };
  const inspect=(event:Event)=>{const field=event.target;if(!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement))return;check(field,true);const form=field.form;if(form){const invalid=Array.from(form.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input,textarea')).some(f=>!f.validity.valid);form.querySelectorAll<HTMLButtonElement>('button[type="submit"]').forEach(b=>{if(invalid&&!b.disabled){b.disabled=true;b.dataset.validationDisabled='true';}else if(!invalid&&b.dataset.validationDisabled){b.disabled=false;delete b.dataset.validationDisabled;}});}};
  const submit=(event:Event)=>{const form=event.target;if(!(form instanceof HTMLFormElement))return;form.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input,textarea').forEach(f=>check(f,true));if(!form.checkValidity()){event.preventDefault();event.stopPropagation();form.reportValidity();}};
  document.addEventListener('input',inspect);document.addEventListener('focusout',inspect);document.addEventListener('submit',submit,true);
  return ()=>{document.removeEventListener('input',inspect);document.removeEventListener('focusout',inspect);document.removeEventListener('submit',submit,true);};
 },[path]);
 return null;
}
