{{- define "auth-service.name" -}}
auth-service
{{- end -}}

{{- define "auth-service.fullname" -}}
{{- printf "%s" (include "auth-service.name" .) -}}
{{- end -}}
