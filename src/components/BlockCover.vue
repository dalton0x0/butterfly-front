<script setup>
// Cover line-art générée en SVG selon le theme du bloc (système, réseau, cloud).
// Fond navy, traits fins en blanc et accent sky. Aucune photo.
defineProps({
  theme: {type: String, default: 'system'},
  height: {type: [Number, String], default: 140}
})
</script>

<template>
  <div
    class="w-full bg-primary-dark flex items-center justify-center overflow-hidden"
    :style="{ height: typeof height === 'number' ? height + 'px' : height }"
  >
    <svg viewBox="0 0 240 120" class="w-full h-full" fill="none" stroke-width="2">
      <!-- Theme système : serveurs empilés + terminal -->
      <template v-if="theme === 'system'">
        <rect x="40" y="30" width="70" height="18" rx="3" stroke="#82c8e5"/>
        <rect x="40" y="54" width="70" height="18" rx="3" stroke="#ffffff" opacity="0.8"/>
        <rect x="40" y="78" width="70" height="18" rx="3" stroke="#82c8e5"/>
        <circle cx="50" cy="39" r="2.5" fill="#82c8e5" stroke="none"/>
        <circle cx="50" cy="63" r="2.5" fill="#ffffff" stroke="none"/>
        <circle cx="50" cy="87" r="2.5" fill="#82c8e5" stroke="none"/>
        <rect x="135" y="40" width="65" height="46" rx="4" stroke="#ffffff" opacity="0.8"/>
        <polyline points="145,55 152,62 145,69" stroke="#82c8e5"/>
        <line x1="158" y1="69" x2="172" y2="69" stroke="#82c8e5"/>
      </template>
      <!-- Theme réseau : noeuds relies + bouclier -->
      <template v-else-if="theme === 'network'">
        <circle cx="60" cy="40" r="8" stroke="#82c8e5"/>
        <circle cx="60" cy="85" r="8" stroke="#ffffff" opacity="0.8"/>
        <circle cx="120" cy="62" r="8" stroke="#82c8e5"/>
        <line x1="67" y1="44" x2="113" y2="58" stroke="#ffffff" opacity="0.5"/>
        <line x1="67" y1="81" x2="113" y2="67" stroke="#ffffff" opacity="0.5"/>
        <path d="M170 38 l22 8 v14 c0 14 -11 22 -22 26 c-11 -4 -22 -12 -22 -26 v-14 z" stroke="#82c8e5"/>
        <polyline points="160,62 167,69 180,54" stroke="#ffffff"/>
      </template>
      <!-- Theme cloud : conteneurs + nuage -->
      <template v-else>
        <path d="M150 50 a16 16 0 0 1 31 4 a12 12 0 0 1 -2 24 h-30 a14 14 0 0 1 1 -28 z" stroke="#82c8e5"/>
        <rect x="42" y="48" width="22" height="22" rx="2" stroke="#ffffff" opacity="0.8"/>
        <rect x="70" y="48" width="22" height="22" rx="2" stroke="#82c8e5"/>
        <rect x="56" y="74" width="22" height="22" rx="2" stroke="#82c8e5"/>
      </template>
    </svg>
  </div>
</template>
