/**
 * TESTE: Normalização de Telefones
 * 
 * Copie e execute este código para testar a normalização de telefones
 */

import { normalizePhone, normalizePhones, normalizePhoneForWasender } from './normalizePhone.js';

console.log("\n" + "=".repeat(80));
console.log("🧪 TESTES DE NORMALIZAÇÃO DE TELEFONE");
console.log("=".repeat(80) + "\n");

// Casos de teste
const testCases = [
  // Casos válidos
  { input: "+55 11 99999-9999", expected: true, desc: "Com +55, espaços e hífen" },
  { input: "+5511999999999", expected: true, desc: "Com +55, sem espaços" },
  { input: "55 11 99999-9999", expected: true, desc: "Com 55, espaços e hífen" },
  { input: "5511999999999", expected: true, desc: "Com 55, sem espaços" },
  { input: "11 99999-9999", expected: true, desc: "Sem código do país, com espaço e hífen" },
  { input: "11999999999", expected: true, desc: "Apenas números" },
  { input: "(11) 99999-9999", expected: true, desc: "Com parênteses" },
  { input: "(11) 9999-9999", expected: true, desc: "Formato antigo com parênteses" },
  { input: "11 9999-9999", expected: true, desc: "Formato antigo sem parênteses" },
  { input: "  11 99999-9999  ", expected: true, desc: "Com espaços em branco extras" },
  
  // Casos inválidos
  { input: "", expected: false, desc: "String vazia" },
  { input: null, expected: false, desc: "Null" },
  { input: undefined, expected: false, desc: "Undefined" },
  { input: "123", expected: false, desc: "Muito curto" },
  { input: "99999999999999", expected: false, desc: "Muito longo" },
  { input: "01999999999", expected: false, desc: "DDD inválido (01)" },
  { input: "9999999999", expected: false, desc: "DDD inválido (99)" },
  { input: "+55119999999", expected: false, desc: "Número incompleto" },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected, desc }, index) => {
  try {
    const result = normalizePhone(input);
    const isValid = result !== null;
    
    if (isValid === expected) {
      console.log(`✅ TESTE ${index + 1}: ${desc}`);
      if (isValid) {
        console.log(`   Entrada: "${input}"`);
        console.log(`   WhatsApp: ${result.whatsapp}`);
        console.log(`   Formatado: ${result.formatted}`);
      }
      passed++;
    } else {
      console.log(`❌ TESTE ${index + 1}: ${desc}`);
      console.log(`   Entrada: "${input}"`);
      console.log(`   Esperado: ${expected ? "válido" : "inválido"}`);
      console.log(`   Obtido: ${isValid ? "válido" : "inválido"}`);
      failed++;
    }
    console.log();
  } catch (err) {
    console.log(`❌ TESTE ${index + 1}: ${desc} - ERRO`);
    console.log(`   Erro: ${err.message}`);
    failed++;
  }
});

// Teste de múltiplos telefones
console.log("\n" + "=".repeat(80));
console.log("🧪 TESTE DE MÚLTIPLOS TELEFONES");
console.log("=".repeat(80) + "\n");

const mixedPhones = [
  "+55 11 99999-9999",
  "11999999999",
  "(11) 9999-9999",
  "invalid123",
  "+5521999999999",
];

const multiResult = normalizePhones(mixedPhones);
console.log(`✅ Telefones válidos: ${multiResult.valid.length}`);
multiResult.valid.forEach((phone, i) => {
  console.log(`   ${i + 1}. ${phone.whatsappPlus}`);
});

console.log(`❌ Telefones inválidos: ${multiResult.invalid.length}`);
multiResult.invalid.forEach((invalid, i) => {
  console.log(`   ${i + 1}. "${invalid.original}"`);
});

// Teste de normalizePhoneForWasender
console.log("\n" + "=".repeat(80));
console.log("🧪 TESTE DE NORMALIZAÇÃO PARA WASENDER");
console.log("=".repeat(80) + "\n");

const wasenderTests = [
  "+55 11 99999-9999",
  "11999999999",
  "(11) 9999-9999",
];

wasenderTests.forEach(phone => {
  const normalized = normalizePhoneForWasender(phone);
  console.log(`Entrada: "${phone}"`);
  console.log(`WAsender: ${normalized}`);
  console.log();
});

// Resumo
console.log("\n" + "=".repeat(80));
console.log("📊 RESUMO DOS TESTES");
console.log("=".repeat(80));
console.log(`✅ Testes aprovados: ${passed}/${testCases.length}`);
console.log(`❌ Testes falhados: ${failed}/${testCases.length}`);
console.log();

if (failed === 0) {
  console.log("🎉 TODOS OS TESTES PASSARAM!");
} else {
  console.log(`⚠️ ${failed} teste(s) falharam`);
}

console.log("=".repeat(80) + "\n");
