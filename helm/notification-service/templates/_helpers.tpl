{{- define "notification-service.name" -}}
notification-service
{{- end -}}

{{- define "notification-service.fullname" -}}
{{- printf "%s" (include "notification-service.name" .) -}}
{{- end -}}
