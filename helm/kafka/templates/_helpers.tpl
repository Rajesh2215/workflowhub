{{- define "kafka.name" -}}
kafka
{{- end -}}

{{- define "kafka.fullname" -}}
{{- printf "%s" (include "kafka.name" .) -}}
{{- end -}}
