{{- define "task-service.name" -}}
task-service
{{- end -}}

{{- define "task-service.fullname" -}}
{{- printf "%s" (include "task-service.name" .) -}}
{{- end -}}
