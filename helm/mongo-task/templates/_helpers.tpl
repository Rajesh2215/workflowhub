{{- define "mongo-task.name" -}}
mongo-task
{{- end -}}

{{- define "mongo-task.fullname" -}}
{{- printf "%s" (include "mongo-task.name" .) -}}
{{- end -}}
