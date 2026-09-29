<!-- Shared shell for the user dashboard (/dashboard/**) and the admin-only
     pages (/admin/**): header + role-aware sidebar + page content. -->
<template>
  <div>
    <DashboardHeader />
    <div class="flex min-h-[calc(100vh-64px)] w-full">
      <DashboardSidebar />
      <div class="min-w-0 flex-1 px-6 py-6 lg:px-8">
        <slot />
      </div>
    </div>
  </div>
</template>
