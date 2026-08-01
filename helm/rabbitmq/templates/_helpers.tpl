{{- define "rabbitmq.name" -}}
rabbitmq
{{- end -}}

{{- define "rabbitmq.fullname" -}}
{{- printf "%s" (include "rabbitmq.name" .) -}}
{{- end -}}
