<template>
  <div v-if="mod">
    <div class="page-head">
      <div class="eyebrow"><span class="flagbar h"><i></i><i></i><i></i></span>Fortschritt</div>
      <h1>Lerntipps</h1>
      <p class="lede">{{ mod.intro }}</p>
    </div>
    <div v-for="(section, i) in mod.sections" :key="i" class="card pad" style="margin-bottom:16px">
      <h3 style="font-family:var(--fs-display);font-size:17px;margin-bottom:12px;display:flex;align-items:center;gap:10px">
        <span class="nav-ico" style="color:var(--navy)" v-html="getIcon(section.icon)"></span>{{ section.title }}
      </h3>
      <ul class="checklist list-clean">
        <li v-for="(line, j) in section.body" :key="j">
          <span class="cm">✓</span><span>{{ line }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { loadModule } from '@/data/loader'
import { getIcon } from '@/infrastructure/icons'
import type { ModuleData } from '@/domain/models/types'

const mod = ref<ModuleData | null>(null)
onMounted(async () => {
  mod.value = await loadModule('lerntipps')
})
</script>
