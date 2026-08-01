{{- define "mongo-analytics.name" -}}
mongo-analytics
{{- end -}}

{{- define "mongo-analytics.fullname" -}}
{{- printf "%s" (include "mongo-analytics.name" .) -}}
{{- end -}}
