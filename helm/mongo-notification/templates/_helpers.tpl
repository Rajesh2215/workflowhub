{{- define "mongo-notification.name" -}}
mongo-notification
{{- end -}}

{{- define "mongo-notification.fullname" -}}
{{- printf "%s" (include "mongo-notification.name" .) -}}
{{- end -}}
