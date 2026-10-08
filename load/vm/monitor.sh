#!/bin/sh
# Samples the VM every INTERVAL seconds (default 2) into a CSV: load, memory, and per container
# CPU and memory, plus the number of database connections. Stop with Ctrl+C.
#
#   sh load/vm/monitor.sh > monitor.csv
INTERVAL=${INTERVAL:-2}
echo "time,load1,mem_used_mb,app_cpu,app_mem,db_cpu,db_mem,db_connections"
while true; do
	now=$(date +%s)
	load=$(cut -d' ' -f1 /proc/loadavg)
	mem=$(free -m | awk '/Mem:/ {print $3}')
	stats=$(docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' | sed 's/ \/ .*//')
	app=$(echo "$stats" | awk '/-app-/ {print $2 "," $3}')
	db=$(echo "$stats" | awk '/-db-/ {print $2 "," $3}')
	conns=$(docker compose -f "$(dirname "$0")/compose.yml" exec -T db psql -U wichtel -tAc \
		"select count(*) from pg_stat_activity where datname = 'wichtel'" 2>/dev/null)
	echo "$now,$load,$mem,$app,$db,$conns"
	sleep "$INTERVAL"
done
