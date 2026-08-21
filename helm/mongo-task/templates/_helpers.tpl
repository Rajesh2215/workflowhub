{{- define "mongo-task.name" -}}
mongo-task
{{- end -}}

{{- define "mongo-task.fullname" -}}
{{- printf "%s" (include "mongo-task.name" .) -}}
{{- end -}}

{{/* Replica set name — used in StatefulSet args and the rs-init Job */}}
{{- define "mongo-task.replicaSetName" -}}
{{- .Values.replicaSetName -}}
{{- end -}}
