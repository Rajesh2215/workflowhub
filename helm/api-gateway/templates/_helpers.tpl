{{- define "api-gateway.name" -}}
api-gateway
{{- end -}}

{{- define "api-gateway.fullname" -}}
{{- printf "%s" (include "api-gateway.name" .) -}}
{{- end -}}
