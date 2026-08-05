<template>
  <div class="app">
    <!-- Sidebar Navigation -->
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <div class="flagbar"><i></i><i></i><i></i></div>
        <div class="brand-txt">
          <b>Prüfungstrainer</b>
          <span>Höherer Auswärtiger Dienst</span>
        </div>
      </div>
      
      <nav class="nav">
        <!-- Start -->
        <div class="nav-group">
          <button
            class="nav-item"
            :class="{ active: currentView === 'dashboard' }"
            @click="navigateTo('dashboard')"
          >
            <span class="nav-ico" v-html="getIcon('home')"></span>
            Dashboard
          </button>
        </div>

        <!-- Prüfungsteile (DGP-Suite, Fachprüfungen, Sprachtests, Analyse, TsU) -->
        <div class="nav-group">
          <div class="nav-label">Prüfungsteile</div>
          <button
            v-for="m in moduleMeta"
            :key="m.id"
            class="nav-item"
            :class="{ active: currentModuleId === m.id }"
            @click="navigateTo(m.id === 'analyse' || m.id === 'tsu' ? m.id : 'module', { id: m.id })"
          >
            <span class="nav-ico" v-html="getIcon(m.ic)"></span>
            {{ m.title }}
          </button>
        </div>

        <!-- Gesamtprüfung -->
        <div class="nav-group">
          <div class="nav-label">Gesamtprüfung</div>
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'dgptest' }"
            @click="navigateTo('dgptest')"
          >
            <span class="nav-ico" v-html="getIcon('clock')"></span>
            DGP-Testabschnitt
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'fullrun' }"
            @click="navigateTo('fullrun')"
          >
            <span class="nav-ico" v-html="getIcon('clock')"></span>
            Voller Durchlauf
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'simulation' }"
            @click="navigateTo('simulation')"
          >
            <span class="nav-ico" v-html="getIcon('repeat')"></span>
            Prüfungssimulation
          </button>
        </div>
        
        <!-- Fortschritt -->
        <div class="nav-group">
          <div class="nav-label">Fortschritt</div>
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'auswertung' }"
            @click="navigateTo('auswertung')"
          >
            <span class="nav-ico" v-html="getIcon('stats')"></span>
            Auswertung
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'fehleranalyse' }"
            @click="navigateTo('fehleranalyse')"
          >
            <span class="nav-ico" v-html="getIcon('search')"></span>
            Fehleranalyse
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'notizen' }"
            @click="navigateTo('notizen')"
          >
            <span class="nav-ico" v-html="getIcon('note')"></span>
            Notizen & Analysen
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentView === 'lerntipps' }"
            @click="navigateTo('lerntipps')"
          >
            <span class="nav-ico" v-html="getIcon('bulb')"></span>
            Lerntipps
          </button>
        </div>
      </nav>
      
      <div class="nav-foot">
        Inoffizielles Übungswerkzeug auf Basis der vom Auswärtigen Amt veröffentlichten Musteraufgaben. Keine Verbindung zum AA.
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="main">
      <!-- Mobile Topbar -->
      <div class="topbar">
        <button class="hamb" @click="toggleNav" aria-label="Menü">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M3 6h18M3 12h18M3 18h18"/>
          </svg>
        </button>
        <div class="flagbar h" style="width:24px"><i></i><i></i><i></i></div>
        <b>Prüfungstrainer · hAD</b>
      </div>

      <!-- View Container -->
      <div class="view-wrap">
        <div id="view">
          <component :is="currentViewComponent" />
        </div>
      </div>
    </div>

    <div class="backdrop" @click="closeNav"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { defineAsyncComponent } from 'vue'
import { useAppStore } from './domain/stores/app-store'
import { getIcon } from './infrastructure/icons'
import { MODULE_META } from './domain/models/constants'

const appStore = useAppStore()
const moduleMeta = MODULE_META

// Dynamic view components
const DashboardView = defineAsyncComponent(() => import('./presentation/views/DashboardView.vue'))
const ModuleLandingView = defineAsyncComponent(() => import('./presentation/views/ModuleLandingView.vue'))
const QuizView = defineAsyncComponent(() => import('./presentation/views/QuizView.vue'))
const ResultsView = defineAsyncComponent(() => import('./presentation/views/ResultsView.vue'))
const TsuView = defineAsyncComponent(() => import('./presentation/views/TsuView.vue'))
const AnalyseView = defineAsyncComponent(() => import('./presentation/views/AnalyseView.vue'))
const LerntippsView = defineAsyncComponent(() => import('./presentation/views/LerntippsView.vue'))
const NotizenView = defineAsyncComponent(() => import('./presentation/views/NotizenView.vue'))
const AuswertungView = defineAsyncComponent(() => import('./presentation/views/AuswertungView.vue'))
const FehleranalyseView = defineAsyncComponent(() => import('./presentation/views/FehleranalyseView.vue'))
const ComingSoonView = defineAsyncComponent(() => import('./presentation/views/ComingSoonView.vue'))

// Current view tracking
const currentView = computed(() => appStore.state.view)
const currentModuleId = computed(() => appStore.state.params?.id)

// Current view component
const currentViewComponent = computed(() => {
  switch (appStore.state.view) {
    case 'dashboard':
      return DashboardView
    case 'module':
      return ModuleLandingView
    case 'quiz':
      return QuizView
    case 'results':
      return ResultsView
    case 'tsu':
      return TsuView
    case 'analyse':
      return AnalyseView
    case 'lerntipps':
      return LerntippsView
    case 'notizen':
      return NotizenView
    case 'auswertung':
      return AuswertungView
    case 'fehleranalyse':
      return FehleranalyseView
    case 'dgptest':
    case 'fullrun':
    case 'simulation':
      return ComingSoonView
    default:
      return DashboardView
  }
})

function toggleNav() {
  document.body.classList.toggle('nav-open')
}

function closeNav() {
  document.body.classList.remove('nav-open')
}

function navigateTo(view: string, params: any = {}) {
  appStore.navigate(view, params)
  // Close mobile nav
  document.body.classList.remove('nav-open')
}

onMounted(() => {
  // Initialize app
  appStore.init()
  // Navigate to dashboard by default
  if (!currentView.value || currentView.value === '') {
    appStore.navigate('dashboard')
  }
})
</script>

<style>
/* All styles are in src/styles/main.css - using global CSS */
</style>
