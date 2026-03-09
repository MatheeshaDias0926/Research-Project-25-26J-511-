#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# Traccar Server Diagnostic & Fix Script for Raspberry Pi
# Run: ssh pi@10.220.172.110 'bash -s' < traccar_diagnose_fix.sh
# Or copy to Pi and run: chmod +x traccar_diagnose_fix.sh && ./traccar_diagnose_fix.sh
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

section() { echo -e "\n${CYAN}═══ $1 ═══${NC}"; }
ok()      { echo -e "  ${GREEN}✓${NC} $1"; }
warn()    { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail()    { echo -e "  ${RED}✗${NC} $1"; }

ISSUES=0

# ─────────────────────────────────────────
section "1. SYSTEM INFO"
# ─────────────────────────────────────────
echo "  Hostname : $(hostname)"
echo "  IP       : $(hostname -I | awk '{print $1}')"
echo "  OS       : $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '"')"
echo "  Kernel   : $(uname -r)"
echo "  Java     : $(java -version 2>&1 | head -1 || echo 'NOT INSTALLED')"

# ─────────────────────────────────────────
section "2. JAVA RUNTIME CHECK"
# ─────────────────────────────────────────
if command -v java &>/dev/null; then
    ok "Java is installed: $(java -version 2>&1 | head -1)"
else
    fail "Java is NOT installed — Traccar requires Java"
    echo -e "  ${YELLOW}FIX: sudo apt update && sudo apt install -y default-jdk${NC}"
    ISSUES=$((ISSUES+1))
fi

# ─────────────────────────────────────────
section "3. TRACCAR INSTALLATION CHECK"
# ─────────────────────────────────────────
TRACCAR_DIR=""
TRACCAR_CONF=""
for dir in /opt/traccar /usr/share/traccar /home/pi/traccar; do
    if [ -d "$dir" ]; then
        TRACCAR_DIR="$dir"
        break
    fi
done

if [ -n "$TRACCAR_DIR" ]; then
    ok "Traccar directory found: $TRACCAR_DIR"
    ls -la "$TRACCAR_DIR/" 2>/dev/null | head -20
else
    fail "Traccar directory not found in /opt/traccar, /usr/share/traccar, or /home/pi/traccar"
    echo -e "  ${YELLOW}FIX: Install Traccar (see section at bottom)${NC}"
    ISSUES=$((ISSUES+1))
fi

# Check for config
for conf in /opt/traccar/conf/traccar.xml /opt/traccar/traccar.xml /etc/traccar/traccar.xml; do
    if [ -f "$conf" ]; then
        TRACCAR_CONF="$conf"
        break
    fi
done

if [ -n "$TRACCAR_CONF" ]; then
    ok "Config found: $TRACCAR_CONF"
    echo -e "  ${CYAN}Contents:${NC}"
    cat "$TRACCAR_CONF" 2>/dev/null | head -40
else
    warn "No traccar.xml config file found"
    ISSUES=$((ISSUES+1))
fi

# ─────────────────────────────────────────
section "4. TRACCAR SERVICE STATUS"
# ─────────────────────────────────────────
if systemctl list-unit-files | grep -q traccar; then
    ok "Traccar systemd service exists"
    systemctl status traccar --no-pager 2>&1 | head -15 || true

    if systemctl is-active --quiet traccar 2>/dev/null; then
        ok "Traccar service is RUNNING"
    else
        fail "Traccar service is NOT running"
        echo -e "  ${YELLOW}FIX: sudo systemctl start traccar${NC}"
        ISSUES=$((ISSUES+1))
    fi

    if systemctl is-enabled --quiet traccar 2>/dev/null; then
        ok "Traccar is enabled on boot"
    else
        warn "Traccar is NOT enabled on boot"
        echo -e "  ${YELLOW}FIX: sudo systemctl enable traccar${NC}"
    fi
else
    warn "No traccar systemd service found"
    echo "  Checking for running process..."
    if pgrep -f "traccar" > /dev/null 2>&1; then
        ok "Traccar process found running"
        ps aux | grep -i traccar | grep -v grep
    else
        fail "No traccar process running"
        ISSUES=$((ISSUES+1))
    fi
fi

# ─────────────────────────────────────────
section "5. PORT CHECK (8082 = Web UI, 5055 = OsmAnd Protocol)"
# ─────────────────────────────────────────
for port in 8082 5055; do
    if ss -tlnp 2>/dev/null | grep -q ":${port} " || netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
        ok "Port $port is LISTENING"
        ss -tlnp 2>/dev/null | grep ":${port} " || netstat -tlnp 2>/dev/null | grep ":${port} "
    else
        fail "Port $port is NOT listening"
        ISSUES=$((ISSUES+1))
    fi
done

# Check for port conflicts
echo ""
echo "  All listening TCP ports:"
ss -tlnp 2>/dev/null | grep LISTEN || netstat -tlnp 2>/dev/null | grep LISTEN || true

# ─────────────────────────────────────────
section "6. FIREWALL CHECK"
# ─────────────────────────────────────────
if command -v ufw &>/dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null || echo "inactive")
    echo "  UFW status: $UFW_STATUS"
    if echo "$UFW_STATUS" | grep -q "active"; then
        if sudo ufw status | grep -qE "8082|5055"; then
            ok "Firewall rules exist for Traccar ports"
        else
            fail "No firewall rules for ports 8082/5055"
            echo -e "  ${YELLOW}FIX:${NC}"
            echo "    sudo ufw allow 8082/tcp comment 'Traccar Web UI'"
            echo "    sudo ufw allow 5055/tcp comment 'Traccar OsmAnd Protocol'"
            ISSUES=$((ISSUES+1))
        fi
    else
        ok "UFW firewall is inactive (ports not blocked by ufw)"
    fi
else
    ok "UFW not installed (no firewall blocking)"
fi

# Also check iptables
if command -v iptables &>/dev/null; then
    IPTABLES_DROP=$(sudo iptables -L INPUT -n 2>/dev/null | grep -c DROP || echo "0")
    if [ "$IPTABLES_DROP" -gt 0 ]; then
        warn "iptables has DROP rules — check if ports 8082/5055 are allowed"
        sudo iptables -L INPUT -n 2>/dev/null | head -20
    else
        ok "No iptables DROP rules found"
    fi
fi

# ─────────────────────────────────────────
section "7. TRACCAR LOGS (last 50 lines)"
# ─────────────────────────────────────────
LOGFILE=""
for lf in /opt/traccar/logs/tracker-server.log /opt/traccar/logs/traccar.log /var/log/traccar.log; do
    if [ -f "$lf" ]; then
        LOGFILE="$lf"
        break
    fi
done

if [ -n "$LOGFILE" ]; then
    ok "Log file: $LOGFILE"
    echo -e "  ${CYAN}--- Last 50 lines ---${NC}"
    tail -50 "$LOGFILE" 2>/dev/null
    echo ""

    # Check for errors
    ERROR_COUNT=$(grep -ci "error\|exception\|fail" "$LOGFILE" 2>/dev/null | tail -1 || echo "0")
    if [ "$ERROR_COUNT" -gt 0 ]; then
        warn "$ERROR_COUNT error/exception lines found in log"
        echo -e "  ${CYAN}--- Recent errors ---${NC}"
        grep -i "error\|exception\|fail" "$LOGFILE" 2>/dev/null | tail -20
    fi

    # Check for location updates from mobile clients
    echo -e "\n  ${CYAN}--- Recent location updates (OsmAnd/5055) ---${NC}"
    grep -i "osmand\|5055\|position\|location" "$LOGFILE" 2>/dev/null | tail -20 || echo "  (No location update entries found)"
else
    warn "No Traccar log file found"
    echo "  Checking journalctl..."
    sudo journalctl -u traccar --no-pager -n 50 2>/dev/null || echo "  (No journal entries)"
fi

# ─────────────────────────────────────────
section "8. TRACCAR DATABASE CHECK"
# ─────────────────────────────────────────
DB_FILE=""
if [ -n "$TRACCAR_CONF" ]; then
    DB_FILE=$(grep -oP 'jdbc:h2:[^;]*' "$TRACCAR_CONF" 2>/dev/null | sed 's|jdbc:h2:||' || true)
fi
# Also check default location
for dbf in /opt/traccar/data/database /opt/traccar/data/traccar; do
    if [ -f "${dbf}.mv.db" ] || [ -f "${dbf}.h2.db" ]; then
        DB_FILE="$dbf"
        break
    fi
done

if [ -n "$DB_FILE" ]; then
    ok "Database file found: ${DB_FILE}*"
    ls -lh "${DB_FILE}"* 2>/dev/null
else
    warn "No H2 database file found (Traccar may use a different DB backend)"
fi

# ─────────────────────────────────────────
section "9. SUMMARY & AUTO-FIX"
# ─────────────────────────────────────────
if [ "$ISSUES" -eq 0 ]; then
    echo -e "\n${GREEN}All checks passed! Traccar appears to be running correctly.${NC}"
else
    echo -e "\n${RED}Found $ISSUES issue(s). Attempting auto-fix...${NC}"

    # Fix 1: Install Java if missing
    if ! command -v java &>/dev/null; then
        echo -e "\n${YELLOW}Installing Java...${NC}"
        sudo apt update && sudo apt install -y default-jdk
    fi

    # Fix 2: Install Traccar if not present
    if [ -z "$TRACCAR_DIR" ]; then
        echo -e "\n${YELLOW}Traccar not installed. Installing...${NC}"
        TRACCAR_VERSION="6.5"
        TRACCAR_URL="https://github.com/traccar/traccar/releases/download/v${TRACCAR_VERSION}/traccar-linux-64-${TRACCAR_VERSION}.zip"
        # For ARM (Raspberry Pi), use the other installer
        ARCH=$(uname -m)
        if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm"* ]]; then
            TRACCAR_URL="https://github.com/traccar/traccar/releases/download/v${TRACCAR_VERSION}/traccar-other-${TRACCAR_VERSION}.zip"
        fi
        echo "  Downloading from: $TRACCAR_URL"
        cd /tmp
        wget -q "$TRACCAR_URL" -O traccar.zip || curl -sL "$TRACCAR_URL" -o traccar.zip
        unzip -o traccar.zip
        sudo ./traccar.run || sudo bash traccar.run
        echo -e "${GREEN}Traccar installed${NC}"
        TRACCAR_DIR="/opt/traccar"
    fi

    # Fix 3: Create/fix traccar.xml config if missing
    if [ -z "$TRACCAR_CONF" ] && [ -d "$TRACCAR_DIR" ]; then
        TRACCAR_CONF="$TRACCAR_DIR/conf/traccar.xml"
        sudo mkdir -p "$(dirname "$TRACCAR_CONF")"
        echo -e "\n${YELLOW}Creating default traccar.xml...${NC}"
        sudo tee "$TRACCAR_CONF" > /dev/null <<'XMLEOF'
<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE properties SYSTEM 'http://java.sun.com/dtd/properties.dtd'>
<properties>

    <entry key='config.default'>./conf/default.xml</entry>

    <!-- Database -->
    <entry key='database.driver'>org.h2.Driver</entry>
    <entry key='database.url'>jdbc:h2:./data/database</entry>
    <entry key='database.user'>sa</entry>
    <entry key='database.password'></entry>

    <!-- Web UI on port 8082 -->
    <entry key='web.port'>8082</entry>

    <!-- Enable OsmAnd protocol on port 5055 -->
    <entry key='osmand.port'>5055</entry>

    <!-- Bind to all interfaces so mobile clients can reach it -->
    <entry key='web.address'>0.0.0.0</entry>

    <!-- Logging -->
    <entry key='logger.file'>./logs/tracker-server.log</entry>
    <entry key='logger.level'>all</entry>

</properties>
XMLEOF
        echo -e "${GREEN}Config created at $TRACCAR_CONF${NC}"
    fi

    # Fix 4: Ensure OsmAnd port is configured in existing config
    if [ -n "$TRACCAR_CONF" ] && [ -f "$TRACCAR_CONF" ]; then
        if ! grep -q "osmand.port" "$TRACCAR_CONF"; then
            echo -e "\n${YELLOW}Adding OsmAnd port 5055 to config...${NC}"
            sudo sed -i '/<\/properties>/i\    <entry key="osmand.port">5055</entry>' "$TRACCAR_CONF"
            ok "Added osmand.port=5055"
        fi
        if ! grep -q "web.port" "$TRACCAR_CONF"; then
            echo -e "\n${YELLOW}Adding web port 8082 to config...${NC}"
            sudo sed -i '/<\/properties>/i\    <entry key="web.port">8082</entry>' "$TRACCAR_CONF"
            ok "Added web.port=8082"
        fi
        # Ensure Traccar binds to 0.0.0.0 (not just localhost)
        if grep -q "web.address.*127.0.0.1\|web.address.*localhost" "$TRACCAR_CONF"; then
            echo -e "\n${YELLOW}Fixing web.address to bind to 0.0.0.0...${NC}"
            sudo sed -i "s|<entry key='web.address'>127.0.0.1</entry>|<entry key='web.address'>0.0.0.0</entry>|" "$TRACCAR_CONF"
            sudo sed -i "s|<entry key='web.address'>localhost</entry>|<entry key='web.address'>0.0.0.0</entry>|" "$TRACCAR_CONF"
            ok "Changed web.address to 0.0.0.0"
        fi
    fi

    # Fix 5: Open firewall ports
    if command -v ufw &>/dev/null; then
        UFW_ACTIVE=$(sudo ufw status 2>/dev/null | head -1 || echo "")
        if echo "$UFW_ACTIVE" | grep -q "active"; then
            echo -e "\n${YELLOW}Opening firewall ports...${NC}"
            sudo ufw allow 8082/tcp comment 'Traccar Web UI' 2>/dev/null || true
            sudo ufw allow 5055/tcp comment 'Traccar OsmAnd Protocol' 2>/dev/null || true
            ok "Firewall rules added"
        fi
    fi

    # Fix 6: Start/restart Traccar service
    if systemctl list-unit-files | grep -q traccar; then
        echo -e "\n${YELLOW}Restarting Traccar service...${NC}"
        sudo systemctl daemon-reload
        sudo systemctl enable traccar
        sudo systemctl restart traccar
        sleep 5
        if systemctl is-active --quiet traccar; then
            ok "Traccar service is now RUNNING"
        else
            fail "Traccar failed to start — check logs:"
            sudo journalctl -u traccar --no-pager -n 30
        fi
    elif [ -d "$TRACCAR_DIR" ]; then
        # Try starting manually
        echo -e "\n${YELLOW}Starting Traccar manually...${NC}"
        cd "$TRACCAR_DIR"
        if [ -f "./bin/traccar" ]; then
            sudo ./bin/traccar start
            sleep 5
        fi
    fi

    # Verify ports after fix
    echo -e "\n${CYAN}Verifying ports after fix...${NC}"
    sleep 3
    for port in 8082 5055; do
        if ss -tlnp 2>/dev/null | grep -q ":${port} " || netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
            ok "Port $port is now LISTENING"
        else
            fail "Port $port is still NOT listening"
        fi
    done
fi

# ─────────────────────────────────────────
section "10. QUICK TEST COMMANDS"
# ─────────────────────────────────────────
PI_IP=$(hostname -I | awk '{print $1}')
echo "
  Test Traccar Web UI (from any browser):
    http://${PI_IP}:8082

  Test OsmAnd endpoint (simulated mobile GPS update):
    curl -v \"http://${PI_IP}:5055/?id=test-device&lat=6.9271&lon=79.8612&speed=45&bearing=180\"

  Traccar Client mobile app settings:
    Protocol : OsmAnd
    Server   : ${PI_IP}
    Port     : 5055
    Device ID: (your device identifier)

  View live logs:
    sudo journalctl -u traccar -f
    OR
    tail -f /opt/traccar/logs/tracker-server.log

  Restart Traccar:
    sudo systemctl restart traccar
"
