{{- define "analytics-service.name" -}}
analytics-service
{{- end -}}

{{- define "analytics-service.fullname" -}}
{{- printf "%s" (include "analytics-service.name" .) -}}
{{- end -}}
